import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getPLReport, CATEGORY_LABEL } from "@/lib/finance-reports";
import { resolveDateRange } from "@/lib/date-range";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.permissions, PERMISSIONS.FINANCE_ACCESS)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { from, to, fromStr, toStr } = resolveDateRange({
    from: req.nextUrl.searchParams.get("from") ?? undefined,
    to: req.nextUrl.searchParams.get("to") ?? undefined,
  });
  const report = await getPLReport(from, to);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("ОПиУ");
  sheet.columns = [
    { header: "Көрсеткіш", key: "label", width: 45 },
    { header: "Сома (₸)", key: "amount", width: 20 },
  ];

  sheet.addRow({ label: `Кезең: ${fromStr} — ${toStr}` });
  sheet.addRow({});
  sheet.addRow({ label: "Сатылымнан түсім", amount: report.revenue });
  sheet.addRow({ label: "Материал/шикізат өзіндік құны (COGS)", amount: -report.cogs });
  sheet.addRow({ label: "Жалпы пайда (Gross profit)", amount: report.grossProfit }).font = { bold: true };
  for (const c of report.opexByCategory) {
    sheet.addRow({ label: CATEGORY_LABEL[c.category] ?? c.category, amount: -c.amount });
  }
  sheet.addRow({ label: "Операциялық шығындар жиыны", amount: -report.totalOpex });
  const netRow = sheet.addRow({ label: "Таза пайда (Net profit)", amount: report.netProfit });
  netRow.font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="OPiU_${fromStr}_${toStr}.xlsx"`,
    },
  });
}
