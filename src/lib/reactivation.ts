import "server-only";
import { prisma } from "@/lib/prisma";
import { enrollContacts } from "@/lib/sequence-sender";

const SILENCE_DAYS = 14; // days of no reply after our last outbound message before re-engaging
const BATCH_SIZE = 50; // cap per poll tick — reactivation is low-urgency, no need to blast everything at once

/**
 * Polled periodically (see instrumentation.ts). Finds deals AI last read as COLD whose most
 * recent message was ours (client never replied back) and it's been SILENCE_DAYS since — then
 * enrolls that client's Contact row into whichever Sequence an admin has flagged as the
 * reactivation default. A no-op until such a sequence exists: enrollContacts requires an
 * ACTIVE sequence with an approved-template first step, same as any other enrollment.
 */
export async function processReactivation(): Promise<void> {
  const reactivationSequence = await prisma.sequence.findFirst({
    where: { isReactivationDefault: true, status: "ACTIVE" },
  });
  if (!reactivationSequence) return;

  const cutoff = new Date(Date.now() - SILENCE_DAYS * 24 * 60 * 60 * 1000);

  const candidates = await prisma.deal.findMany({
    where: {
      aiTemperature: "COLD",
      pipelineStage: { isFinal: false },
      whatsappMessages: { some: {} },
    },
    include: {
      client: true,
      whatsappMessages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    take: 500, // scan window per tick — filtered further below before any enrollment happens
  });

  let enrolled = 0;
  for (const deal of candidates) {
    if (enrolled >= BATCH_SIZE) break;

    const lastMessage = deal.whatsappMessages[0];
    if (!lastMessage || lastMessage.direction !== "OUT") continue; // client already has the last word
    if (lastMessage.createdAt > cutoff) continue; // not silent long enough yet
    if (!deal.client.phone) continue;

    const contact = await prisma.contact.upsert({
      where: { phone: deal.client.phone },
      update: { clientId: deal.clientId },
      create: {
        phone: deal.client.phone,
        fullName: deal.client.fullName,
        clientId: deal.clientId,
        createdById: reactivationSequence.createdById,
      },
    });

    const alreadyEnrolled = await prisma.sequenceEnrollment.findUnique({
      where: { sequenceId_contactId: { sequenceId: reactivationSequence.id, contactId: contact.id } },
    });
    if (alreadyEnrolled) continue; // one gentle nudge ever, not a repeating loop

    await enrollContacts(reactivationSequence.id, [contact.id]);
    enrolled++;
  }
}
