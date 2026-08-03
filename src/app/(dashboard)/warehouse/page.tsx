import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreateProductForm } from "@/components/warehouse/create-product-form";

const CATEGORY_LABEL: Record<string, string> = {
  material: "Шикізат",
  finished: "Дайын өнім",
};

function formatMoney(n: number) {
  return new Intl.NumberFormat("ru-RU").format(n) + " ₸";
}

export default async function WarehousePage() {
  const session = await requireSession();
  const canManage = hasPermission(session.user.permissions, PERMISSIONS.WAREHOUSE_MANAGE);

  const [products, stockSums] = await Promise.all([
    prisma.product.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.stock.groupBy({ by: ["productId"], _sum: { quantity: true } }),
  ]);

  const stockByProduct = new Map(stockSums.map((s) => [s.productId, Number(s._sum.quantity ?? 0)]));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Барлық тауар мен шикізаттың қалдығы (барлық складтар бойынша). Қозғалыс тарихы мен айналымды көру
        үшін тауарды басыңыз.
      </p>

      {canManage && <CreateProductForm />}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Атауы</TableHead>
            <TableHead>Түрі</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Қалдық</TableHead>
            <TableHead>Сату бағасы</TableHead>
            <TableHead>Өзіндік құн</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((p) => {
            const qty = stockByProduct.get(p.id) ?? 0;
            return (
              <TableRow key={p.id}>
                <TableCell>
                  <Link href={`/warehouse/products/${p.id}`} className="font-medium hover:underline">
                    {p.name}
                  </Link>
                  {!p.isActive && <Badge variant="secondary" className="ml-2">жасырын</Badge>}
                </TableCell>
                <TableCell className="text-muted-foreground">{CATEGORY_LABEL[p.category] ?? p.category}</TableCell>
                <TableCell className="text-muted-foreground">{p.sku ?? "—"}</TableCell>
                <TableCell className={qty <= 0 ? "text-destructive" : undefined}>
                  {qty} {p.unit}
                </TableCell>
                <TableCell>{formatMoney(Number(p.price))}</TableCell>
                <TableCell className="text-muted-foreground">{formatMoney(Number(p.cost))}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
