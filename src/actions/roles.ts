"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";

export async function updateRolePermissions(roleId: string, permissionKeys: string[]) {
  await requirePermission(PERMISSIONS.ADMIN_ROLES_MANAGE);

  const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    prisma.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId, permissionId: p.id })),
      skipDuplicates: true,
    }),
  ]);

  revalidatePath("/admin/roles");
  revalidatePath(`/admin/roles/${roleId}`);
}
