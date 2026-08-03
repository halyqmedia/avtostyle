import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateUserDialog } from "@/components/admin/create-user-dialog";
import { UserRowActions } from "@/components/admin/user-row-actions";

export default async function AdminUsersPage() {
  await requirePermission(PERMISSIONS.ADMIN_USERS_MANAGE);

  const [users, roles] = await Promise.all([
    prisma.user.findMany({ include: { role: true }, orderBy: { createdAt: "asc" } }),
    prisma.role.findMany({ orderBy: { label: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Барлық қызметкерлер: {users.length}</p>
        <CreateUserDialog roles={roles.map((r) => ({ id: r.id, label: r.label }))} />
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Аты-жөні</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Рөлі мен статусы</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  <Link href={`/admin/users/${u.id}`} className="hover:underline">
                    {u.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <UserRowActions
                    userId={u.id}
                    roleId={u.roleId}
                    isActive={u.isActive}
                    commissionRate={u.commissionRate ? Number(u.commissionRate) : null}
                    roles={roles.map((r) => ({ id: r.id, label: r.label }))}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
