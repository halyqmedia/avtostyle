"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { uploadMedia } from "@/lib/media-storage";

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

const createUserSchema = z.object({
  name: z.string().min(2, "Аты кемінде 2 таңба болуы керек"),
  email: z.string().email("Email дұрыс емес"),
  password: z.string().min(6, "Құпия сөз кемінде 6 таңба болуы керек"),
  roleId: z.string().min(1, "Рөлді таңдаңыз"),
});

export type FormState = { error?: string } | undefined;

export async function createUser(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requirePermission(PERMISSIONS.ADMIN_USERS_MANAGE);

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    roleId: formData.get("roleId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Деректер дұрыс емес" };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (existing) {
    return { error: "Бұл email-мен қолданушы бар" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      roleId: parsed.data.roleId,
    },
  });

  revalidatePath("/admin/users");
  return undefined;
}

export async function updateUserRole(userId: string, roleId: string) {
  await requirePermission(PERMISSIONS.ADMIN_USERS_MANAGE);
  await prisma.user.update({ where: { id: userId }, data: { roleId } });
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  await requirePermission(PERMISSIONS.ADMIN_USERS_MANAGE);
  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

export async function updateUserCommissionRate(userId: string, rate: number | null) {
  await requirePermission(PERMISSIONS.ADMIN_USERS_MANAGE);
  if (rate !== null && (!Number.isFinite(rate) || rate < 0 || rate > 100)) {
    throw new Error("Комиссия пайызы 0-100 аралығында болуы керек");
  }
  await prisma.user.update({ where: { id: userId }, data: { commissionRate: rate } });
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

export async function updateUserName(userId: string, name: string) {
  await requirePermission(PERMISSIONS.ADMIN_USERS_MANAGE);
  const trimmed = name.trim();
  if (trimmed.length < 2) throw new Error("Аты кемінде 2 таңба болуы керек");
  await prisma.user.update({ where: { id: userId }, data: { name: trimmed } });
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

export async function updateUserPhone(userId: string, phone: string) {
  await requirePermission(PERMISSIONS.ADMIN_USERS_MANAGE);
  await prisma.user.update({ where: { id: userId }, data: { phone: phone.trim() || null } });
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

export async function resetUserPassword(userId: string, newPassword: string) {
  await requirePermission(PERMISSIONS.ADMIN_USERS_MANAGE);
  if (newPassword.length < 6) throw new Error("Құпия сөз кемінде 6 таңба болуы керек");
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  revalidatePath(`/admin/users/${userId}`);
}

export async function updateUserPhoto(userId: string, formData: FormData) {
  await requirePermission(PERMISSIONS.ADMIN_USERS_MANAGE);
  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) throw new Error("Фото таңдаңыз");
  if (photo.size > MAX_PHOTO_BYTES) throw new Error("Фото тым үлкен (8MB-тан аспауы керек)");

  const buffer = Buffer.from(await photo.arrayBuffer());
  const key = await uploadMedia(`users/${userId}/photo-${randomUUID()}`, buffer, photo.type || "application/octet-stream");
  await prisma.user.update({ where: { id: userId }, data: { photoUrl: key } });
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
}
