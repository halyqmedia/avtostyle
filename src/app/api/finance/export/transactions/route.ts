import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { CATEGORY_LABEL } from "@/lib/finance-reports";
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

  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: from, lt: to } },
    include: { deal: true, user: true },
    orderBy: { date: "desc" },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Транзакциялар");
  sheet.columns = [
    { header: "Күні", key: "date", width: 14 },
    { header: "Түрі", key: "type", width: 10 },
    { header: "Санаты", key: "category", width: 24 },
    { header: "Сома (₸)", key: "amount", width: 16 },
    { header: "Сделка", key: "deal", width: 24 },
    { header: "Қызметкер", key: "user", width: 20 },
    { header: "Сипаттама", key: "description", width: 30 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const t of transactions) {
    sheet.addRow({
      date: t.date.toISOString().slice(0, 10),
      type: t.type === "INCOME" ? "Кіріс" : "Шығыс",
      category: CATEGORY_LABEL[t.category] ?? t.category,
      amount: t.type === "INCOME" ? Number(t.amount) : -Number(t.amount),
      deal: t.deal?.title ?? "",
      user: t.user?.name ?? "",
      description: t.description ?? "",
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Tranzaksiyalar_${fromStr}_${toStr}.xlsx"`,
    },
  });
}
