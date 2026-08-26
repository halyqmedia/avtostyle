import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Finds or creates the Client + an open Deal for a WhatsApp phone number — shared by the Cloud
 * API webhook, the Baileys personal-WhatsApp handler, and campaign sends, so a client is
 * recognized the same way no matter which channel first touched them. Reuses an existing
 * non-final deal rather than spawning a duplicate lead for a repeat contact.
 */
export async function findOrCreateLeadForPhone(opts: {
  phone: string; // normalized "+7XXXXXXXXXX"
  whatsappDigits: string;
  fallbackName?: string;
  source: string;
  createdById: string;
  assignedToId?: string;
  dealTitle?: string;
  dealComment?: string;
  // Which funnel a brand-new deal's default stage comes from, and which WhatsApp number it's
  // tied to for later AI replies (see WhatsAppNumber). Defaults to the original single-funnel
  // behavior for call sites that haven't been updated yet (e.g. Baileys personal-number chats).
  funnelKey?: string;
  whatsappNumberId?: string;
}): Promise<{ clientId: string; dealId: string; isNewDeal: boolean }> {
  const {
    phone,
    whatsappDigits,
    fallbackName,
    source,
    createdById,
    assignedToId,
    dealTitle,
    dealComment,
    funnelKey = "SALES",
    whatsappNumberId,
  } = opts;

  let client = await prisma.client.findUnique({ where: { phone } });
  if (!client) {
    client = await prisma.client.create({
      data: { fullName: fallbackName || phone, phone, whatsappId: whatsappDigits, source },
    });
  } else if (client.whatsappId !== whatsappDigits) {
    client = await prisma.client.update({ where: { id: client.id }, data: { whatsappId: whatsappDigits } });
  }

  const existingActiveDeal = await prisma.deal.findFirst({
    where: { clientId: client.id, pipelineStage: { isFinal: false } },
    orderBy: { createdAt: "desc" },
  });

  if (existingActiveDeal) {
    const backfill: { assignedToId?: string; whatsappNumberId?: string } = {};
    if (!existingActiveDeal.assignedToId && assignedToId) backfill.assignedToId = assignedToId;
    // Pre-migration deals (or ones started before a number was registered) had no
    // whatsappNumberId — pick it up on a later message so AI replies start using the right
    // funnel/credentials, without disturbing a deal that's already tied to a number.
    if (!existingActiveDeal.whatsappNumberId && whatsappNumberId) backfill.whatsappNumberId = whatsappNumberId;
    if (Object.keys(backfill).length > 0) {
      await prisma.deal.update({ where: { id: existingActiveDeal.id }, data: backfill });
    }
    return { clientId: client.id, dealId: existingActiveDeal.id, isNewDeal: false };
  }

  const defaultStage = await prisma.pipelineStage.findFirst({ where: { pipeline: funnelKey, isDefault: true } });
  if (!defaultStage) throw new Error(`"${funnelKey}" pipeline-де әдепкі кезең табылмады`);

  const deal = await prisma.deal.create({
    data: {
      title: dealTitle || client.phone || phone,
      clientId: client.id,
      amount: 0,
      pipelineStageId: defaultStage.id,
      whatsappNumberId,
      createdById,
      assignedToId,
      source,
      comment: dealComment,
    },
  });

  return { clientId: client.id, dealId: deal.id, isNewDeal: true };
}
