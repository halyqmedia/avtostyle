import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateSupplierForm } from "@/components/warehouse/create-supplier-form";

export default async function SuppliersPage() {
  const session = await requireSession();
  const canManage = hasPermission(session.user.permissions, PERMISSIONS.WAREHOUSE_MANAGE);

  const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="flex flex-col gap-4">
      {canManage && <CreateSupplierForm />}

      {suppliers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Жабдықтаушылар әлі қосылмаған.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Атауы</TableHead>
              <TableHead>Байланыс тұлғасы</TableHead>
              <TableHead>Телефон</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-muted-foreground">{s.contactPerson ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{s.phone ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
