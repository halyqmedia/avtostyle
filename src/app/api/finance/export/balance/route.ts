import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getBalanceSheet } from "@/lib/finance-reports";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.permissions, PERMISSIONS.FINANCE_ACCESS)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sheet = await getBalanceSheet();

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Баланс");
  ws.columns = [
    { header: "Көрсеткіш", key: "label", width: 45 },
    { header: "Сома (₸)", key: "amount", width: 20 },
  ];
  ws.getRow(1).font = { bold: true };

  ws.addRow({ label: `Жағдай күні: ${sheet.asOf.toISOString().slice(0, 10)}` });
  ws.addRow({});
  ws.addRow({ label: "Кассадағы ақша (Cash)", amount: sheet.cash });
  ws.addRow({ label: "Клиент борышы (дебиторлық)", amount: sheet.accountsReceivable });
  ws.addRow({ label: "Складтағы тауар құны", amount: sheet.inventoryValue });
  ws.addRow({
    label: "Активтер жиыны",
    amount: sheet.cash + sheet.accountsReceivable + sheet.inventoryValue,
  }).font = { bold: true };
  ws.addRow({ label: "Жабдықтаушыға борыш (кредиторлық)", amount: -sheet.accountsPayable });
  const netRow = ws.addRow({ label: "Таза актив (Net assets)", amount: sheet.netAssets });
  netRow.font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="Balans.xlsx"',
    },
  });
}
