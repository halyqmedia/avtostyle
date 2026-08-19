import "server-only";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppTemplate, uploadWhatsAppMedia, toWhatsAppRecipient } from "@/lib/whatsapp-cloud";
import { findOrCreateLeadForPhone } from "@/lib/lead-intake";
import { normalizePhone } from "@/lib/phone";
import { downloadMedia } from "@/lib/media-storage";
import { hasReachedDailyTemplateCap } from "@/lib/template-send-throttle";

const SEND_GAP_MS = 1500; // same pacing as campaign-sender — one shared WABA, one shared rhythm

// Every step send in this file goes through sendWhatsAppTemplate (Cloud API / WABA) — never a
// manager's personal Baileys session. Drip volume is exactly the traffic pattern that risks a
// personal number getting banned; only the shared, Meta-managed WABA number carries it.

/** Enrolls a set of Contacts in a Sequence, due for step 1 after that step's delayDays. */
export async function enrollContacts(sequenceId: string, contactIds: string[]): Promise<void> {
  const sequence = await prisma.sequence.findUnique({
    where: { id: sequenceId },
    include: { steps: { orderBy: { order: "asc" }, take: 1 } },
  });
  if (!sequence) throw new Error("Тізбек табылмады");
  const firstStep = sequence.steps[0];
  if (!firstStep) throw new Error("Тізбекте кемінде бір қадам болуы керек");

  const nextSendAt = new Date(Date.now() + firstStep.delayDays * 24 * 60 * 60 * 1000);

  for (const contactId of contactIds) {
    await prisma.sequenceEnrollment.upsert({
      where: { sequenceId_contactId: { sequenceId, contactId } },
      update: {}, // already enrolled — leave their progress alone
      create: { sequenceId, contactId, nextSendAt, status: "ACTIVE" },
    });
  }

  if (sequence.status === "DRAFT") {
    await prisma.sequence.update({ where: { id: sequenceId }, data: { status: "ACTIVE" } });
  }
}

async function resolveStepHeaderMediaId(step: {
  id: string;
  headerMetaMediaId: string | null;
  template: { headerType: string | null; headerMediaKey: string | null; headerMimeType: string | null };
}): Promise<string | null> {
  if (step.headerMetaMediaId) return step.headerMetaMediaId;
  if (!step.template.headerType || !step.template.headerMediaKey) return null;

  const buffer = await downloadMedia(step.template.headerMediaKey);
  const mediaId = await uploadWhatsAppMedia(buffer, step.template.headerMimeType ?? "application/octet-stream");
  await prisma.sequenceStep.update({ where: { id: step.id }, data: { headerMetaMediaId: mediaId } });
  return mediaId;
}

/**
 * Sends one enrollment's due step and schedules the next one. Called by the poller in
 * instrumentation.ts — never awaited by a request, same fire-and-forget spirit as campaign sends.
 */
async function sendEnrollmentStep(enrollmentId: string): Promise<void> {
  const enrollment = await prisma.sequenceEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      contact: true,
      sequence: { include: { steps: { orderBy: { order: "asc" }, include: { template: true } } } },
    },
  });
  if (!enrollment || enrollment.status !== "ACTIVE") return;

  const stepIndex = enrollment.currentStep; // 0-based index of the step about to be sent
  const step = enrollment.sequence.steps[stepIndex];
  if (!step) {
    await prisma.sequenceEnrollment.update({ where: { id: enrollmentId }, data: { status: "COMPLETED", nextSendAt: null } });
    return;
  }

  try {
    const phone = normalizePhone(enrollment.contact.phone) ?? enrollment.contact.phone;
    const digits = phone.replace(/\D/g, "");
    const to = toWhatsAppRecipient(digits, phone);
    if (!to) throw new Error("Телефон нөмірі жарамсыз");

    const { clientId, dealId } = await findOrCreateLeadForPhone({
      phone,
      whatsappDigits: digits,
      fallbackName: enrollment.contact.fullName ?? undefined,
      source: "sequence",
      createdById: enrollment.sequence.createdById,
      dealTitle: enrollment.contact.fullName || phone,
      dealComment: `Тізбек: ${enrollment.sequence.name}`,
    });
    await prisma.contact.update({ where: { id: enrollment.contactId }, data: { clientId } }).catch(() => {});

    const headerMediaId = await resolveStepHeaderMediaId(step);
    const bodyParams = step.template.variableCount > 0 ? [enrollment.contact.fullName || phone] : [];
    const header =
      step.template.headerType && headerMediaId
        ? {
            format: step.template.headerType as "IMAGE" | "DOCUMENT",
            mediaId: headerMediaId,
            fileName: step.template.headerFileName ?? undefined,
          }
        : undefined;

    const { idMessage } = await sendWhatsAppTemplate(to, step.template.name, step.template.language, bodyParams, header);

    await prisma.whatsAppMessage.create({
      data: {
        dealId,
        direction: "OUT",
        body: step.template.bodyText,
        whatsappMessageId: idMessage,
        sentById: enrollment.sequence.createdById,
        channel: "CLOUD_API",
      },
    });

    const nextStep = enrollment.sequence.steps[stepIndex + 1];
    await prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: {
        currentStep: stepIndex + 1,
        status: nextStep ? "ACTIVE" : "COMPLETED",
        lastSentAt: new Date(),
        nextSendAt: nextStep ? new Date(Date.now() + nextStep.delayDays * 24 * 60 * 60 * 1000) : null,
        dealId,
        whatsappMessageId: idMessage,
      },
    });
  } catch (err) {
    await prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: { status: "FAILED", nextSendAt: null },
    });
    console.error("Sequence step send failed:", enrollmentId, err);
  }
}

/**
 * Polled periodically (see instrumentation.ts) — sends every enrollment whose next step has come
 * due, respecting the same shared daily cap and pacing as one-shot campaigns.
 */
export async function processDueEnrollments(): Promise<void> {
  const due = await prisma.sequenceEnrollment.findMany({
    where: { status: "ACTIVE", nextSendAt: { lte: new Date() } },
    orderBy: { nextSendAt: "asc" },
    select: { id: true },
    take: 200, // one poll tick's worth — the cap below will usually bite first
  });

  for (const { id } of due) {
    if (await hasReachedDailyTemplateCap()) break; // resumes on the next poll tick once the day rolls over
    await sendEnrollmentStep(id);
    await new Promise((r) => setTimeout(r, SEND_GAP_MS));
  }
}

/** Stops a contact's active sequence progress the moment they reply — the point of a drip. */
export async function markEnrollmentsReplied(phone: string): Promise<void> {
  const normalized = normalizePhone(phone) ?? phone;
  const contact = await prisma.contact.findUnique({ where: { phone: normalized } });
  if (!contact) return;

  await prisma.sequenceEnrollment.updateMany({
    where: { contactId: contact.id, status: "ACTIVE" },
    data: { status: "REPLIED", nextSendAt: null },
  });
}
