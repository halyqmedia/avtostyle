"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";

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
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  await requirePermission(PERMISSIONS.ADMIN_USERS_MANAGE);
  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  revalidatePath("/admin/users");
}
