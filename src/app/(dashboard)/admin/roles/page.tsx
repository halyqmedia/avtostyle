import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminRolesPage() {
  await requirePermission(PERMISSIONS.ADMIN_ROLES_MANAGE);

  const roles = await prisma.role.findMany({
    include: { permissions: true, users: { select: { id: true } } },
    orderBy: { label: "asc" },
  });

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {roles.map((r) => (
        <Link key={r.id} href={`/admin/roles/${r.id}`}>
          <Card className="h-full transition-colors hover:bg-muted/40">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                {r.label}
                {r.isSystem && <Badge variant="secondary">жүйелік</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {r.users.length} қызметкер · {r.permissions.length} доступ
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
