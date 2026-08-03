"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";

const quickReplySchema = z.object({
  title: z.string().min(2, "Атауы кемінде 2 таңба"),
  body: z.string().min(1, "Мәтін бос болмауы керек"),
});

export type FormState = { error?: string } | undefined;

export async function createQuickReply(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requirePermission(PERMISSIONS.ADMIN_QUICK_REPLIES_MANAGE);

  const parsed = quickReplySchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Деректер дұрыс емес" };

  await prisma.quickReply.create({ data: parsed.data });
  revalidatePath("/admin/quick-replies");
}

export async function updateQuickReply(id: string, title: string, body: string) {
  await requirePermission(PERMISSIONS.ADMIN_QUICK_REPLIES_MANAGE);
  if (!title.trim() || !body.trim()) return;

  await prisma.quickReply.update({ where: { id }, data: { title: title.trim(), body: body.trim() } });
  revalidatePath("/admin/quick-replies");
}

export async function deleteQuickReply(id: string) {
  await requirePermission(PERMISSIONS.ADMIN_QUICK_REPLIES_MANAGE);
  await prisma.quickReply.delete({ where: { id } });
  revalidatePath("/admin/quick-replies");
}
