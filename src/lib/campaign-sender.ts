import "server-only";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppTemplate, toWhatsAppRecipient } from "@/lib/whatsapp-cloud";
import { findOrCreateLeadForPhone } from "@/lib/lead-intake";
import { normalizePhone } from "@/lib/phone";

const SEND_GAP_MS = 1500; // pacing between sends — avoid tripping Meta's per-WABA rate/quality limits
const DAILY_CAP = 200; // conservative default across ALL campaigns combined; raise once the WABA's quality rating is proven over time

async function todaysCampaignSendCount(): Promise<number> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  return prisma.campaignRecipient.count({ where: { sentAt: { gte: since } } });
}

/**
 * Paced background broadcast loop — runs to completion in this process (a persistent Railway
 * container, not a serverless function) after the `sendCampaign` action returns, the same way
 * Baileys sessions keep running past their triggering request. Not meant to be awaited by callers.
 */
export async function runCampaignSend(campaignId: string): Promise<void> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, include: { template: true } });
  if (!campaign) return;
  if (campaign.template.status !== "APPROVED") {
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: "FAILED" } });
    return;
  }

  await prisma.campaign.update({ where: { id: campaignId }, data: { status: "SENDING", startedAt: new Date() } });

  const recipients = await prisma.campaignRecipient.findMany({
    where: { campaignId, status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });

  let sent = campaign.sentCount;
  let failed = campaign.failedCount;

  for (const recipient of recipients) {
    if ((await todaysCampaignSendCount()) >= DAILY_CAP) {
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "FAILED", errorMessage: `Рассылканың күндік лимитіне жетті (${DAILY_CAP}) — ертең жалғасады` },
      });
      failed++;
      await prisma.campaign.update({ where: { id: campaignId }, data: { sentCount: sent, failedCount: failed } });
      continue;
    }

    try {
      const phone = normalizePhone(recipient.phone) ?? recipient.phone;
      const digits = phone.replace(/\D/g, "");
      const to = toWhatsAppRecipient(digits, phone);
      if (!to) throw new Error("Телефон нөмірі жарамсыз");

      const { dealId } = await findOrCreateLeadForPhone({
        phone,
        whatsappDigits: digits,
        fallbackName: recipient.fullName ?? undefined,
        source: "campaign",
        createdById: campaign.createdById,
        dealTitle: recipient.fullName || phone,
        dealComment: `Рассылка: ${campaign.name}`,
      });

      const bodyParams = campaign.template.variableCount > 0 ? [recipient.fullName || phone] : [];
      const { idMessage } = await sendWhatsAppTemplate(
        to,
        campaign.template.name,
        campaign.template.language,
        bodyParams,
      );

      await prisma.whatsAppMessage.create({
        data: {
          dealId,
          direction: "OUT",
          body: campaign.template.bodyText,
          whatsappMessageId: idMessage,
          sentById: campaign.createdById,
          channel: "CLOUD_API",
        },
      });

      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "SENT", dealId, whatsappMessageId: idMessage, sentAt: new Date() },
      });
      sent++;
    } catch (err) {
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "FAILED", errorMessage: err instanceof Error ? err.message : "Белгісіз қате" },
      });
      failed++;
    }

    await prisma.campaign.update({ where: { id: campaignId }, data: { sentCount: sent, failedCount: failed } });
    await new Promise((r) => setTimeout(r, SEND_GAP_MS));
  }

  await prisma.campaign.update({ where: { id: campaignId }, data: { status: "COMPLETED", completedAt: new Date() } });
}
