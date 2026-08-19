import "server-only";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppTemplate, uploadWhatsAppMedia, toWhatsAppRecipient } from "@/lib/whatsapp-cloud";
import { findOrCreateLeadForPhone } from "@/lib/lead-intake";
import { normalizePhone } from "@/lib/phone";
import { downloadMedia } from "@/lib/media-storage";
import { hasReachedDailyTemplateCap, DAILY_TEMPLATE_SEND_CAP } from "@/lib/template-send-throttle";

const SEND_GAP_MS = 1500; // pacing between sends — avoid tripping Meta's per-WABA rate/quality limits

/**
 * Paced background broadcast loop — runs to completion in this process (a persistent Railway
 * container, not a serverless function) after the `sendCampaign` action returns, the same way
 * Baileys sessions keep running past their triggering request. Not meant to be awaited by callers.
 *
 * Always sends through the Cloud API (WABA) — never a manager's personal Baileys session. Bulk
 * template sends are exactly the kind of traffic pattern that gets a personal number banned;
 * only the shared, Meta-managed WABA number is meant to carry campaign/sequence volume.
 */
export async function runCampaignSend(campaignId: string): Promise<void> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, include: { template: true } });
  if (!campaign) return;
  if (campaign.template.status !== "APPROVED") {
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: "FAILED" } });
    return;
  }

  await prisma.campaign.update({ where: { id: campaignId }, data: { status: "SENDING", startedAt: new Date() } });

  // The template's header file (if any) is uploaded to Meta once per campaign run and that same
  // media id is reused for every recipient — re-uploading per-message would be wasteful and slow.
  let headerMetaMediaId = campaign.headerMetaMediaId;
  if (campaign.template.headerType && campaign.template.headerMediaKey && !headerMetaMediaId) {
    try {
      const buffer = await downloadMedia(campaign.template.headerMediaKey);
      headerMetaMediaId = await uploadWhatsAppMedia(
        buffer,
        campaign.template.headerMimeType ?? "application/octet-stream",
      );
      await prisma.campaign.update({ where: { id: campaignId }, data: { headerMetaMediaId } });
    } catch (err) {
      await prisma.campaign.update({ where: { id: campaignId }, data: { status: "FAILED" } });
      console.error("Campaign header upload failed:", campaignId, err);
      return;
    }
  }

  const recipients = await prisma.campaignRecipient.findMany({
    where: { campaignId, status: "PENDING" },
    include: { contact: true },
    orderBy: { createdAt: "asc" },
  });

  let sent = campaign.sentCount;
  let failed = campaign.failedCount;

  for (const recipient of recipients) {
    if (await hasReachedDailyTemplateCap()) {
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: "FAILED",
          errorMessage: `Рассылканың күндік лимитіне жетті (${DAILY_TEMPLATE_SEND_CAP}) — ертең жалғасады`,
        },
      });
      failed++;
      await prisma.campaign.update({ where: { id: campaignId }, data: { sentCount: sent, failedCount: failed } });
      continue;
    }

    try {
      const phone = normalizePhone(recipient.contact.phone) ?? recipient.contact.phone;
      const digits = phone.replace(/\D/g, "");
      const to = toWhatsAppRecipient(digits, phone);
      if (!to) throw new Error("Телефон нөмірі жарамсыз");

      const { clientId, dealId } = await findOrCreateLeadForPhone({
        phone,
        whatsappDigits: digits,
        fallbackName: recipient.contact.fullName ?? undefined,
        source: "campaign",
        createdById: campaign.createdById,
        dealTitle: recipient.contact.fullName || phone,
        dealComment: `Рассылка: ${campaign.name}`,
      });
      // Link the audience Contact to the sales Client/Deal it resolved to, so the contacts board
      // can jump straight to the conversation once someone engages with a campaign.
      await prisma.contact.update({ where: { id: recipient.contactId }, data: { clientId } }).catch(() => {});

      const bodyParams = campaign.template.variableCount > 0 ? [recipient.contact.fullName || phone] : [];
      const header =
        campaign.template.headerType && headerMetaMediaId
          ? {
              format: campaign.template.headerType as "IMAGE" | "DOCUMENT",
              mediaId: headerMetaMediaId,
              fileName: campaign.template.headerFileName ?? undefined,
            }
          : undefined;
      const { idMessage } = await sendWhatsAppTemplate(
        to,
        campaign.template.name,
        campaign.template.language,
        bodyParams,
        header,
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
