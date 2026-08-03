import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreateWarehouseForm } from "@/components/warehouse/create-warehouse-form";

export default async function WarehousesPage() {
  const session = await requireSession();
  const canManage = hasPermission(session.user.permissions, PERMISSIONS.WAREHOUSE_MANAGE);

  const warehouses = await prisma.warehouse.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="flex flex-col gap-4">
      {canManage && <CreateWarehouseForm />}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Атауы</TableHead>
            <TableHead>Күйі</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {warehouses.map((w) => (
            <TableRow key={w.id}>
              <TableCell className="font-medium">{w.name}</TableCell>
              <TableCell className="flex gap-1.5">
                {w.isDefault && <Badge>негізгі</Badge>}
                {!w.isActive && <Badge variant="secondary">жасырын</Badge>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
