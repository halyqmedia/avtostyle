import { getPLReport, CATEGORY_LABEL } from "@/lib/finance-reports";
import { resolveDateRange } from "@/lib/date-range";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { PeriodFilter } from "@/components/finance/period-filter";

function formatMoney(n: number) {
  return new Intl.NumberFormat("ru-RU").format(Math.round(n)) + " ₸";
}

export default async function FinancePLPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const { from, to, fromStr, toStr } = resolveDateRange(params);
  const report = await getPLReport(from, to);

  return (
    <div className="flex flex-col gap-4">
      <PeriodFilter
        action="/finance"
        from={fromStr}
        to={toStr}
        exportHref={`/api/finance/export/pl?from=${fromStr}&to=${toStr}`}
      />

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Түсім (кіріс)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-emerald-600">{formatMoney(report.revenue)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Жалпы пайда</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatMoney(report.grossProfit)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Таза пайда</CardTitle>
          </CardHeader>
          <CardContent className={`text-2xl font-semibold ${report.netProfit >= 0 ? "text-emerald-600" : "text-destructive"}`}>
            {formatMoney(report.netProfit)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Пайда мен зиян есебі (ОПиУ)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Сатылымнан түсім</TableCell>
                <TableCell className="text-right text-emerald-600">{formatMoney(report.revenue)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="pl-6 text-muted-foreground">Материал/шикізат өзіндік құны (COGS)</TableCell>
                <TableCell className="text-right text-destructive">−{formatMoney(report.cogs)}</TableCell>
              </TableRow>
              <TableRow className="border-t-2">
                <TableCell className="font-medium">Жалпы пайда (Gross profit)</TableCell>
                <TableCell className="text-right font-medium">{formatMoney(report.grossProfit)}</TableCell>
              </TableRow>
              {report.opexByCategory.map((c) => (
                <TableRow key={c.category}>
                  <TableCell className="pl-6 text-muted-foreground">{CATEGORY_LABEL[c.category] ?? c.category}</TableCell>
                  <TableCell className="text-right text-destructive">−{formatMoney(c.amount)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t">
                <TableCell className="text-muted-foreground">Операциялық шығындар жиыны</TableCell>
                <TableCell className="text-right text-destructive">−{formatMoney(report.totalOpex)}</TableCell>
              </TableRow>
              <TableRow className="border-t-2">
                <TableCell className="text-base font-semibold">Таза пайда (Net profit)</TableCell>
                <TableCell
                  className={`text-right text-base font-semibold ${report.netProfit >= 0 ? "text-emerald-600" : "text-destructive"}`}
                >
                  {formatMoney(report.netProfit)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
