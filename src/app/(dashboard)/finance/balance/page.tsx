import { getBalanceSheet } from "@/lib/finance-reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

function formatMoney(n: number) {
  return new Intl.NumberFormat("ru-RU").format(Math.round(n)) + " ₸";
}

export default async function FinanceBalancePage() {
  const sheet = await getBalanceSheet();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Жағдай күні: {format(sheet.asOf, "dd.MM.yyyy HH:mm")} — қарапайым баланс (толық қос жазба
          бухгалтериясы емес).
        </p>
        <Button asChild variant="outline">
          <a href="/api/finance/export/balance">Excel-ге жүктеу</a>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Таза актив (Net assets)</CardTitle>
          </CardHeader>
          <CardContent className={`text-2xl font-semibold ${sheet.netAssets >= 0 ? "text-emerald-600" : "text-destructive"}`}>
            {formatMoney(sheet.netAssets)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Кассадағы ақша (Cash)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatMoney(sheet.cash)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Активтер мен міндеттемелер</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Кассадағы ақша (барлық уақыт кіріс − шығыс)</TableCell>
                <TableCell className="text-right">{formatMoney(sheet.cash)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Клиент борышы (дебиторлық)</TableCell>
                <TableCell className="text-right">{formatMoney(sheet.accountsReceivable)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Складтағы тауар құны</TableCell>
                <TableCell className="text-right">{formatMoney(sheet.inventoryValue)}</TableCell>
              </TableRow>
              <TableRow className="border-t">
                <TableCell className="text-muted-foreground">Активтер жиыны</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatMoney(sheet.cash + sheet.accountsReceivable + sheet.inventoryValue)}
                </TableCell>
              </TableRow>
              <TableRow className="border-t-2">
                <TableCell className="font-medium">Жабдықтаушыға борыш (кредиторлық)</TableCell>
                <TableCell className="text-right text-destructive">−{formatMoney(sheet.accountsPayable)}</TableCell>
              </TableRow>
              <TableRow className="border-t-2">
                <TableCell className="text-base font-semibold">Таза актив (меншікті капитал бағасы)</TableCell>
                <TableCell
                  className={`text-right text-base font-semibold ${sheet.netAssets >= 0 ? "text-emerald-600" : "text-destructive"}`}
                >
                  {formatMoney(sheet.netAssets)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
