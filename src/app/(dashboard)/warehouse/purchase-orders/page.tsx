import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreatePurchaseOrderDialog } from "@/components/warehouse/create-purchase-order-dialog";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Жасалды",
  ORDERED: "Тапсырыс берілді",
  PARTIALLY_RECEIVED: "Ішінара қабылданды",
  RECEIVED: "Қабылданды",
  CANCELLED: "Болдырылмады",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  DRAFT: "secondary",
  ORDERED: "secondary",
  PARTIALLY_RECEIVED: "default",
  RECEIVED: "default",
  CANCELLED: "destructive",
};

function formatMoney(n: number) {
  return new Intl.NumberFormat("ru-RU").format(n) + " ₸";
}

export default async function PurchaseOrdersPage() {
  const session = await requireSession();
  const canManage = hasPermission(session.user.permissions, PERMISSIONS.WAREHOUSE_MANAGE);

  const [orders, suppliers, warehouses, products] = await Promise.all([
    prisma.purchaseOrder.findMany({
      include: { supplier: true, warehouse: true, items: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.warehouse.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="flex justify-end">
          <CreatePurchaseOrderDialog
            suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
            warehouses={warehouses.map((w) => ({ id: w.id, name: w.name, isDefault: w.isDefault }))}
            products={products.map((p) => ({ id: p.id, name: p.name, unit: p.unit }))}
          />
        </div>
      )}

      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">Әлі заказ жасалмаған.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>№</TableHead>
              <TableHead>Жабдықтаушы</TableHead>
              <TableHead>Склад</TableHead>
              <TableHead>Сома</TableHead>
              <TableHead>Күйі</TableHead>
              <TableHead>Төлем</TableHead>
              <TableHead>Күні</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => {
              const total = o.items.reduce((s, it) => s + Number(it.quantity) * Number(it.price), 0);
              return (
                <TableRow key={o.id}>
                  <TableCell>
                    <Link href={`/warehouse/purchase-orders/${o.id}`} className="font-medium hover:underline">
                      №{o.number}
                    </Link>
                  </TableCell>
                  <TableCell>{o.supplier.name}</TableCell>
                  <TableCell className="text-muted-foreground">{o.warehouse.name}</TableCell>
                  <TableCell>{formatMoney(total)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[o.status] ?? "secondary"}>{STATUS_LABEL[o.status] ?? o.status}</Badge>
                  </TableCell>
                  <TableCell>{o.isPaid ? <Badge>төленген</Badge> : <Badge variant="secondary">төленбеген</Badge>}</TableCell>
                  <TableCell className="text-muted-foreground">{format(o.createdAt, "dd.MM.yyyy")}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
