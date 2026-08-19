import "server-only";
import { prisma } from "@/lib/prisma";
import { notifyAllAdmins } from "@/lib/admin-notify";

const ESCALATION_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours unanswered

function dealUrl(dealId: string): string | null {
  if (!process.env.RAILWAY_PUBLIC_DOMAIN) return null;
  return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/crm/deals/${dealId}`;
}

/**
 * Polled every 15 minutes (see instrumentation.ts). Finds deals that have been HOT for over
 * 2 hours with no human reply since (aiHotSince is cleared the moment a manager sends a
 * message — see sendDealWhatsAppMessage/sendDealWhatsAppFile) and pings every admin's own
 * connected WhatsApp once per hot streak (aiEscalatedAt guards against re-notifying every tick).
 */
export async function processHotLeadEscalations(): Promise<void> {
  const cutoff = new Date(Date.now() - ESCALATION_THRESHOLD_MS);

  const dueDeals = await prisma.deal.findMany({
    where: {
      aiTemperature: "HOT",
      aiHotSince: { lte: cutoff },
      aiEscalatedAt: null,
      pipelineStage: { isFinal: false },
    },
    include: { client: true, assignedTo: true },
  });
  if (dueDeals.length === 0) return;

  for (const deal of dueDeals) {
    const url = dealUrl(deal.id);
    const text = [
      "⏰ Ыстық лидке 2 сағаттан бері жауап жоқ!",
      "",
      `Клиент: ${deal.client.fullName}`,
      deal.client.phone ? `Телефон: ${deal.client.phone}` : null,
      `Жауапты маман: ${deal.assignedTo?.name ?? "тағайындалмаған"}`,
      url ? "" : null,
      url,
    ].filter((line) => line !== null);

    await notifyAllAdmins(text.join("\n"));
    await prisma.deal.update({ where: { id: deal.id }, data: { aiEscalatedAt: new Date() } });
  }
}
