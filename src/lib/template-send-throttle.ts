import "server-only";
import { prisma } from "@/lib/prisma";
import { DAILY_TEMPLATE_SEND_CAP } from "@/lib/campaign-limits";

// Campaigns and sequences both send template messages through the same WABA/phone number, so
// they must share one daily budget against Meta's real per-account rate/quality limits — two
// independent counters would silently double the actual cap.
export { DAILY_TEMPLATE_SEND_CAP };

export async function todaysTemplateSendCount(): Promise<number> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const [campaignCount, sequenceCount] = await Promise.all([
    prisma.campaignRecipient.count({ where: { sentAt: { gte: since } } }),
    prisma.sequenceEnrollment.count({ where: { lastSentAt: { gte: since } } }),
  ]);
  return campaignCount + sequenceCount;
}

export async function hasReachedDailyTemplateCap(): Promise<boolean> {
  return (await todaysTemplateSendCount()) >= DAILY_TEMPLATE_SEND_CAP;
}
