import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { CATEGORY_LABEL } from "@/lib/finance-reports";
import { resolveDateRange } from "@/lib/date-range";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PeriodFilter } from "@/components/finance/period-filter";
import { CreateTransactionForm } from "@/components/finance/create-transaction-form";

function formatMoney(n: number) {
  return new Intl.NumberFormat("ru-RU").format(Math.round(n)) + " ₸";
}

export default async function FinanceTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await requireSession();
  const canManage = hasPermission(session.user.permissions, PERMISSIONS.FINANCE_MANAGE);
  const params = await searchParams;
  const { from, to, fromStr, toStr } = resolveDateRange(params);

  const [transactions, users] = await Promise.all([
    prisma.transaction.findMany({
      where: { date: { gte: from, lt: to } },
      include: { deal: true, productionOrder: true, purchaseOrder: true, user: true, createdBy: true },
      orderBy: { date: "desc" },
      take: 300,
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PeriodFilter
        action="/finance/transactions"
        from={fromStr}
        to={toStr}
        exportHref={`/api/finance/export/transactions?from=${fromStr}&to=${toStr}`}
      />

      {canManage && <CreateTransactionForm users={users.map((u) => ({ id: u.id, name: u.name }))} />}

      {transactions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Бұл кезеңде транзакция жоқ.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Күні</TableHead>
              <TableHead>Түрі</TableHead>
              <TableHead>Санаты</TableHead>
              <TableHead>Сома</TableHead>
              <TableHead>Байланыс</TableHead>
              <TableHead>Сипаттама</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-muted-foreground">{format(t.date, "dd.MM.yyyy")}</TableCell>
                <TableCell>
                  <Badge variant={t.type === "INCOME" ? "default" : "secondary"}>
                    {t.type === "INCOME" ? "Кіріс" : "Шығыс"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{CATEGORY_LABEL[t.category] ?? t.category}</TableCell>
                <TableCell className={t.type === "INCOME" ? "text-emerald-600" : "text-destructive"}>
                  {t.type === "INCOME" ? "+" : "−"}
                  {formatMoney(Number(t.amount))}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {t.deal && (
                    <Link href={`/crm/deals/${t.deal.id}`} className="hover:underline">
                      {t.deal.title}
                    </Link>
                  )}
                  {t.productionOrder && (
                    <Link href={`/production/orders/${t.productionOrder.id}`} className="hover:underline">
                      Өндіріс заявкасы
                    </Link>
                  )}
                  {t.purchaseOrder && (
                    <Link href={`/warehouse/purchase-orders/${t.purchaseOrder.id}`} className="hover:underline">
                      Заказ №{t.purchaseOrder.number}
                    </Link>
                  )}
                  {t.user && <span>{t.user.name}</span>}
                </TableCell>
                <TableCell className="text-muted-foreground">{t.description ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
