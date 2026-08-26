"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";

export type FormState = { error?: string } | undefined;

const createSchema = z.object({
  phoneNumberId: z.string().trim().min(5, "Phone Number ID қате"),
  label: z.string().trim().min(2, "Ат кемінде 2 таңба"),
  funnelId: z.string().min(1, "Воронканы таңдаңыз"),
  managerId: z.string().min(1).optional(),
  accessToken: z.string().trim().min(1).optional(),
});

/** Registers a new Meta Cloud API phone number and routes it to a funnel (+ optional default manager). */
export async function createWhatsAppNumber(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requirePermission(PERMISSIONS.ADMIN_PIPELINE_MANAGE);

  const raw = {
    phoneNumberId: formData.get("phoneNumberId"),
    label: formData.get("label"),
    funnelId: formData.get("funnelId"),
    managerId: formData.get("managerId") || undefined,
    accessToken: formData.get("accessToken") || undefined,
  };
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Деректер дұрыс емес" };

  const existing = await prisma.whatsAppNumber.findUnique({ where: { phoneNumberId: parsed.data.phoneNumberId } });
  if (existing) return { error: "Бұл Phone Number ID бұрын тіркелген" };

  await prisma.whatsAppNumber.create({ data: parsed.data });

  revalidatePath("/admin/whatsapp-numbers");
}

export async function updateWhatsAppNumberFunnel(id: string, funnelId: string): Promise<void> {
  await requirePermission(PERMISSIONS.ADMIN_PIPELINE_MANAGE);
  await prisma.whatsAppNumber.update({ where: { id }, data: { funnelId } });
  revalidatePath("/admin/whatsapp-numbers");
}

export async function updateWhatsAppNumberManager(id: string, managerId: string | null): Promise<void> {
  await requirePermission(PERMISSIONS.ADMIN_PIPELINE_MANAGE);
  await prisma.whatsAppNumber.update({ where: { id }, data: { managerId } });
  revalidatePath("/admin/whatsapp-numbers");
}
