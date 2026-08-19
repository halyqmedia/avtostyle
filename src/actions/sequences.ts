"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { enrollContacts } from "@/lib/sequence-sender";

export type FormState = { error?: string } | undefined;

/**
 * `stepsJson` is a JSON-encoded array of `{ templateId: string; delayDays: number }`, built
 * client-side by the sequence editor — simpler than parsing dozens of indexed form fields.
 */
export async function createSequence(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requirePermission(PERMISSIONS.CAMPAIGNS_MANAGE);

  const name = String(formData.get("name") ?? "").trim();
  const stepsRaw = String(formData.get("stepsJson") ?? "[]");

  if (!name) return { error: "Тізбек атын енгізіңіз" };

  let steps: { templateId: string; delayDays: number }[];
  try {
    steps = JSON.parse(stepsRaw);
  } catch {
    return { error: "Қадамдар дұрыс емес" };
  }
  if (!Array.isArray(steps) || steps.length === 0) return { error: "Кемінде бір қадам қосыңыз" };
  for (const s of steps) {
    if (!s.templateId) return { error: "Әр қадамда шаблон таңдалуы керек" };
    if (!Number.isInteger(s.delayDays) || s.delayDays < 0) return { error: "Күн саны дұрыс емес" };
  }

  await prisma.sequence.create({
    data: {
      name,
      createdById: session.user.id,
      steps: {
        createMany: {
          data: steps.map((s, i) => ({ order: i + 1, templateId: s.templateId, delayDays: s.delayDays })),
        },
      },
    },
  });

  revalidatePath("/campaigns");
  return undefined;
}

export async function enrollSelectedContacts(sequenceId: string, contactIds: string[]): Promise<void> {
  await requirePermission(PERMISSIONS.CAMPAIGNS_MANAGE);
  if (contactIds.length === 0) throw new Error("Кемінде бір клиентті таңдаңыз");

  await enrollContacts(sequenceId, contactIds);

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/sequences/${sequenceId}`);
}

/** Only one sequence can be the auto-reactivation target — setting it clears the flag off every other one. */
export async function setReactivationDefault(sequenceId: string, enabled: boolean): Promise<void> {
  await requirePermission(PERMISSIONS.CAMPAIGNS_MANAGE);

  await prisma.$transaction([
    prisma.sequence.updateMany({ where: { isReactivationDefault: true }, data: { isReactivationDefault: false } }),
    ...(enabled ? [prisma.sequence.update({ where: { id: sequenceId }, data: { isReactivationDefault: true } })] : []),
  ]);

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/sequences/${sequenceId}`);
}
