import { getEmployeeReport } from "@/lib/finance-reports";
import { resolveDateRange } from "@/lib/date-range";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PeriodFilter } from "@/components/finance/period-filter";

function formatMoney(n: number) {
  return new Intl.NumberFormat("ru-RU").format(Math.round(n)) + " ₸";
}

export default async function FinanceEmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const { from, to, fromStr, toStr } = resolveDateRange(params);
  const rows = await getEmployeeReport(from, to);

  return (
    <div className="flex flex-col gap-4">
      <PeriodFilter
        action="/finance/employees"
        from={fromStr}
        to={toStr}
        exportHref={`/api/finance/export/employees?from=${fromStr}&to=${toStr}`}
      />

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Бұл кезеңде төлем болған жоқ.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Қызметкер</TableHead>
              <TableHead>Жабылған төлем саны</TableHead>
              <TableHead>Сатылым сомасы</TableHead>
              <TableHead>Комиссия</TableHead>
              <TableHead>Жалақы</TableHead>
              <TableHead>Жиыны</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.userId}>
                <TableCell className="font-medium">{r.userName}</TableCell>
                <TableCell className="text-muted-foreground">{r.dealsCount}</TableCell>
                <TableCell>{formatMoney(r.salesTotal)}</TableCell>
                <TableCell className="text-emerald-600">{formatMoney(r.commission)}</TableCell>
                <TableCell className="text-muted-foreground">{formatMoney(r.salary)}</TableCell>
                <TableCell className="font-medium">{formatMoney(r.commission + r.salary)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
