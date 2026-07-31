import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { PermissionMatrix } from "@/components/admin/permission-matrix";

export default async function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(PERMISSIONS.ADMIN_ROLES_MANAGE);
  const { id } = await params;

  const [role, allPermissions] = await Promise.all([
    prisma.role.findUnique({ where: { id }, include: { permissions: true } }),
    prisma.permission.findMany({ orderBy: { label: "asc" } }),
  ]);
  if (!role) notFound();

  const permissionsByModule: Record<string, { key: string; label: string }[]> = {};
  for (const p of allPermissions) {
    permissionsByModule[p.module] ??= [];
    permissionsByModule[p.module].push({ key: p.key, label: p.label });
  }

  const initialChecked = role.permissions.map((rp) => rp.permissionId);
  const checkedKeys = allPermissions
    .filter((p) => initialChecked.includes(p.id))
    .map((p) => p.key);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">{role.label}</h2>
        <p className="text-sm text-muted-foreground">
          Бұл рөлге қандай беттер мен әрекеттерге доступ берілетінін таңдаңыз.
        </p>
      </div>
      <PermissionMatrix
        roleId={role.id}
        permissionsByModule={permissionsByModule}
        initialChecked={checkedKeys}
      />
    </div>
  );
}
