import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getEmployeeReport } from "@/lib/finance-reports";
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
  const rows = await getEmployeeReport(from, to);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Қызметкерлер есебі");
  sheet.columns = [
    { header: "Қызметкер", key: "userName", width: 28 },
    { header: "Жабылған төлем саны", key: "dealsCount", width: 20 },
    { header: "Сатылым сомасы (₸)", key: "salesTotal", width: 20 },
    { header: "Комиссия (₸)", key: "commission", width: 18 },
    { header: "Жалақы (₸)", key: "salary", width: 18 },
    { header: "Жиыны (₸)", key: "total", width: 18 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const r of rows) {
    sheet.addRow({
      userName: r.userName,
      dealsCount: r.dealsCount,
      salesTotal: r.salesTotal,
      commission: r.commission,
      salary: r.salary,
      total: r.commission + r.salary,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Qyzmetkerler_${fromStr}_${toStr}.xlsx"`,
    },
  });
}
