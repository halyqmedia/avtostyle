import "server-only";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppTemplate, uploadWhatsAppMedia, toWhatsAppRecipient } from "@/lib/whatsapp-cloud";
import { findOrCreateLeadForPhone } from "@/lib/lead-intake";
import { normalizePhone } from "@/lib/phone";
import { downloadMedia } from "@/lib/media-storage";
import { hasReachedDailyTemplateCap } from "@/lib/template-send-throttle";

// Pacing between sends. A number on Meta's TIER_250 messaging limit (the default until the
// display name is approved) reads a fast burst — hundreds of sends in a few minutes — as spammy
// and starts async-failing already-accepted messages ("Spam Rate limit hit", "healthy ecosystem
// engagement"), not just rejecting new ones. 4s keeps well clear of that, still only ~13min/day at the cap.
const SEND_GAP_MS = 4000;

// Guards against the same campaign being driven by two overlapping loops — the initial
// `sendCampaign` call and a resume poll tick (see resumePausedCampaigns) could otherwise both
// pick it up around the same moment.
const runningCampaigns = new Set<string>();

/**
 * Paced background broadcast loop — runs to completion in this process (a persistent Railway
 * container, not a serverless function) after the `sendCampaign` action returns, the same way
 * Baileys sessions keep running past their triggering request. Not meant to be awaited by callers.
 *
 * Always sends through the Cloud API (WABA) — never a manager's personal Baileys session. Bulk
 * template sends are exactly the kind of traffic pattern that gets a personal number banned;
 * only the shared, Meta-managed WABA number is meant to carry campaign/sequence volume.
 *
 * A run that hits the shared daily send cap stops partway through and leaves the rest of its
 * recipients PENDING — see resumePausedCampaigns, polled from instrumentation.ts, which picks
 * the campaign back up once the next day's quota opens up.
 */
export async function runCampaignSend(campaignId: string): Promise<void> {
  if (runningCampaigns.has(campaignId)) return;
  runningCampaigns.add(campaignId);
  try {
    await runCampaignSendInner(campaignId);
  } finally {
    runningCampaigns.delete(campaignId);
  }
}

async function runCampaignSendInner(campaignId: string): Promise<void> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, include: { template: true } });
  if (!campaign) return;
  if (campaign.template.status !== "APPROVED") {
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: "FAILED" } });
    return;
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "SENDING", startedAt: campaign.startedAt ?? new Date() },
  });

  // Resync the running totals from the recipient rows themselves at the start of every run —
  // self-heals any drift from a prior crash mid-loop or (historically) the old absolute-overwrite
  // bug where a webhook-driven correction landed between two loop writes and got clobbered.
  const [trueSent, trueFailed] = await Promise.all([
    prisma.campaignRecipient.count({ where: { campaignId, status: { in: ["SENT", "DELIVERED", "READ"] } } }),
    prisma.campaignRecipient.count({ where: { campaignId, status: "FAILED" } }),
  ]);
  await prisma.campaign.update({ where: { id: campaignId }, data: { sentCount: trueSent, failedCount: trueFailed } });

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

  for (const recipient of recipients) {
    // Stop for today, leaving the rest PENDING — resumePausedCampaigns picks this campaign back
    // up on a later poll tick once tomorrow's quota opens up (same pattern as sequence sends).
    if (await hasReachedDailyTemplateCap()) break;

    // Someone hit "Тоқтату" (stopCampaign) while this loop was mid-run — notice within one
    // pacing interval instead of grinding through the rest of the recipient list regardless.
    const current = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { status: true } });
    if (current?.status !== "SENDING") return;

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
      // Relative increment, not an absolute overwrite — handleStatusUpdate (webhook) also only
      // ever increments/decrements these fields, so the two can never clobber each other no
      // matter how they interleave. An earlier version tracked sent/failed in a local variable
      // and wrote it as a snapshot each iteration, which silently undid any webhook correction
      // that landed mid-run (a message counted "sent" here, then reported FAILED moments later).
      await prisma.campaign.update({ where: { id: campaignId }, data: { sentCount: { increment: 1 } } });
    } catch (err) {
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "FAILED", errorMessage: err instanceof Error ? err.message : "Белгісіз қате" },
      });
      await prisma.campaign.update({ where: { id: campaignId }, data: { failedCount: { increment: 1 } } });
    }

    await new Promise((r) => setTimeout(r, SEND_GAP_MS));
  }

  // If the cap cut the loop short, PENDING recipients remain — leave status as SENDING so
  // resumePausedCampaigns finds it again; only mark COMPLETED once nothing is left to send.
  const stillPending = await prisma.campaignRecipient.count({ where: { campaignId, status: "PENDING" } });
  if (stillPending === 0) {
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: "COMPLETED", completedAt: new Date() } });
  }
}

/**
 * Polled periodically (see instrumentation.ts) — resumes any campaign that stopped partway
 * through because it hit the shared daily send cap, now that a new day's quota may be available.
 */
export async function resumePausedCampaigns(): Promise<void> {
  const paused = await prisma.campaign.findMany({
    where: { status: "SENDING", recipients: { some: { status: "PENDING" } } },
    select: { id: true },
  });
  for (const { id } of paused) {
    runCampaignSend(id).catch((err) => console.error("Campaign resume failed:", id, err));
  }
}
