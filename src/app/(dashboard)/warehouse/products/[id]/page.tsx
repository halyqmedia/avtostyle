import Link from "next/link";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StockAdjustmentForm } from "@/components/warehouse/stock-adjustment-form";

const REASON_LABEL: Record<string, string> = {
  purchase_order: "Жабдықтаушыдан келді",
  production_order: "Өндіріске жұмсалды",
  manual_adjustment: "Қолмен түзету",
};

const TYPE_LABEL: Record<string, string> = { IN: "Кіріс", OUT: "Шығыс", ADJUSTMENT: "Түзету" };

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const canManage = hasPermission(session.user.permissions, PERMISSIONS.WAREHOUSE_MANAGE);

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) notFound();

  const [stockRows, movements, warehouses] = await Promise.all([
    prisma.stock.findMany({ where: { productId: id }, include: { warehouse: true } }),
    prisma.stockMovement.findMany({
      where: { productId: id },
      include: { warehouse: true, createdBy: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.warehouse.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const totalIn = movements.filter((m) => Number(m.quantity) > 0).reduce((s, m) => s + Number(m.quantity), 0);
  const totalOut = movements.filter((m) => Number(m.quantity) < 0).reduce((s, m) => s + Number(m.quantity), 0);
  const totalStock = stockRows.reduce((s, r) => s + Number(r.quantity), 0);

  return (
    <div className="grid max-w-4xl gap-4">
      <div>
        <Link
          href="/warehouse"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Артқа
        </Link>
        <h1 className="text-xl font-semibold">{product.name}</h1>
        <p className="text-sm text-muted-foreground">
          {product.sku ?? "SKU жоқ"} · {product.category === "material" ? "Шикізат" : "Дайын өнім"}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Жалпы қалдық</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {totalStock} {product.unit}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Кіріс (соңғы 100 жазба)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-emerald-600">
            +{totalIn} {product.unit}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Шығыс (соңғы 100 жазба)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-destructive">
            {totalOut} {product.unit}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Складтар бойынша қалдық</CardTitle>
        </CardHeader>
        <CardContent>
          {stockRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Бұл тауар бойынша әлі қозғалыс болған жоқ.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Склад</TableHead>
                  <TableHead>Қалдық</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockRows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.warehouse.name}</TableCell>
                    <TableCell>
                      {Number(s.quantity)} {product.unit}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Қолмен түзету</CardTitle>
          </CardHeader>
          <CardContent>
            <StockAdjustmentForm productId={product.id} warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Қозғалыс тарихы</CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Әзірге қозғалыс жоқ.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Күні</TableHead>
                  <TableHead>Түрі</TableHead>
                  <TableHead>Саны</TableHead>
                  <TableHead>Қалдық (кейін)</TableHead>
                  <TableHead>Себебі</TableHead>
                  <TableHead>Склад</TableHead>
                  <TableHead>Кім</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => {
                  const qty = Number(m.quantity);
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-muted-foreground">{format(m.createdAt, "dd.MM.yyyy HH:mm")}</TableCell>
                      <TableCell>{TYPE_LABEL[m.type] ?? m.type}</TableCell>
                      <TableCell className={qty >= 0 ? "text-emerald-600" : "text-destructive"}>
                        {qty >= 0 ? `+${qty}` : qty} {product.unit}
                      </TableCell>
                      <TableCell>
                        {Number(m.balanceAfter)} {product.unit}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {REASON_LABEL[m.reason] ?? m.reason}
                        {m.note && ` — ${m.note}`}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{m.warehouse.name}</TableCell>
                      <TableCell className="text-muted-foreground">{m.createdBy.name}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
