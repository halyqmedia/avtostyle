import "server-only";
import { prisma } from "@/lib/prisma";

const COGS_CATEGORY = "material_purchase";
const OPEX_CATEGORIES = ["commission", "salary", "rent", "utilities", "other"] as const;

export const CATEGORY_LABEL: Record<string, string> = {
  sales_payment: "Сатылымнан түсім",
  material_purchase: "Материал/шикізат сатып алу",
  commission: "Менеджер комиссиясы",
  salary: "Жалақы",
  rent: "Жалдау (аренда)",
  utilities: "Коммуналдық қызметтер",
  other: "Басқа",
};

export interface PLReport {
  from: Date;
  to: Date;
  revenue: number;
  cogs: number;
  grossProfit: number;
  opexByCategory: { category: string; amount: number }[];
  totalOpex: number;
  netProfit: number;
}

export async function getPLReport(from: Date, to: Date): Promise<PLReport> {
  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: from, lt: to } },
  });

  const revenue = transactions
    .filter((t) => t.type === "INCOME" && t.category === "sales_payment")
    .reduce((s, t) => s + Number(t.amount), 0);

  const cogs = transactions
    .filter((t) => t.type === "EXPENSE" && t.category === COGS_CATEGORY)
    .reduce((s, t) => s + Number(t.amount), 0);

  const opexByCategory = OPEX_CATEGORIES.map((category) => ({
    category,
    amount: transactions
      .filter((t) => t.type === "EXPENSE" && t.category === category)
      .reduce((s, t) => s + Number(t.amount), 0),
  })).filter((c) => c.amount > 0);

  const totalOpex = opexByCategory.reduce((s, c) => s + c.amount, 0);
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - totalOpex;

  return { from, to, revenue, cogs, grossProfit, opexByCategory, totalOpex, netProfit };
}

export interface EmployeeReportRow {
  userId: string;
  userName: string;
  salesTotal: number;
  dealsCount: number;
  commission: number;
  salary: number;
}

export async function getEmployeeReport(from: Date, to: Date): Promise<EmployeeReportRow[]> {
  const [salesPayments, commissionTx, salaryTx, users] = await Promise.all([
    prisma.transaction.findMany({
      where: { type: "INCOME", category: "sales_payment", date: { gte: from, lt: to }, dealId: { not: null } },
      include: { deal: { select: { assignedToId: true } } },
    }),
    prisma.transaction.findMany({
      where: { type: "EXPENSE", category: "commission", date: { gte: from, lt: to }, userId: { not: null } },
    }),
    prisma.transaction.findMany({
      where: { type: "EXPENSE", category: "salary", date: { gte: from, lt: to }, userId: { not: null } },
    }),
    prisma.user.findMany({ where: { isActive: true } }),
  ]);

  const byUser = new Map<string, EmployeeReportRow>();
  const ensure = (userId: string, userName: string) => {
    let row = byUser.get(userId);
    if (!row) {
      row = { userId, userName, salesTotal: 0, dealsCount: 0, commission: 0, salary: 0 };
      byUser.set(userId, row);
    }
    return row;
  };
  const nameById = new Map(users.map((u) => [u.id, u.name]));

  for (const t of salesPayments) {
    const assignedToId = t.deal?.assignedToId;
    if (!assignedToId) continue;
    const row = ensure(assignedToId, nameById.get(assignedToId) ?? "?");
    row.salesTotal += Number(t.amount);
    row.dealsCount += 1;
  }
  for (const t of commissionTx) {
    if (!t.userId) continue;
    const row = ensure(t.userId, nameById.get(t.userId) ?? "?");
    row.commission += Number(t.amount);
  }
  for (const t of salaryTx) {
    if (!t.userId) continue;
    const row = ensure(t.userId, nameById.get(t.userId) ?? "?");
    row.salary += Number(t.amount);
  }

  return Array.from(byUser.values()).sort((a, b) => b.salesTotal - a.salesTotal);
}

export interface BalanceSheet {
  asOf: Date;
  cash: number;
  accountsReceivable: number;
  inventoryValue: number;
  accountsPayable: number;
  netAssets: number;
}

/**
 * Simplified balance sheet, not full double-entry bookkeeping:
 * cash (all-time income minus expense) + client debt (AR) + inventory value
 * minus what we still owe suppliers (AP). Point-in-time snapshot as of now —
 * AR/inventory/AP reflect current state, not historical state "asOf" a past date.
 */
export async function getBalanceSheet(asOf: Date = new Date()): Promise<BalanceSheet> {
  const [incomeSum, expenseSum, activeDeals, stockRows, unpaidOrders] = await Promise.all([
    prisma.transaction.aggregate({ where: { type: "INCOME", date: { lte: asOf } }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { type: "EXPENSE", date: { lte: asOf } }, _sum: { amount: true } }),
    prisma.deal.findMany({
      where: { pipelineStage: { key: { not: "LOST" } } },
      select: { amount: true, prepayment: true },
    }),
    prisma.stock.findMany({ include: { product: true } }),
    prisma.purchaseOrder.findMany({
      where: { isPaid: false, status: { not: "CANCELLED" } },
      include: { items: true },
    }),
  ]);

  const cash = Number(incomeSum._sum.amount ?? 0) - Number(expenseSum._sum.amount ?? 0);
  const accountsReceivable = activeDeals.reduce(
    (s, d) => s + Math.max(Number(d.amount) - Number(d.prepayment), 0),
    0,
  );
  const inventoryValue = stockRows.reduce((s, r) => s + Number(r.quantity) * Number(r.product.cost), 0);
  const accountsPayable = unpaidOrders.reduce(
    (s, po) => s + po.items.reduce((si, it) => si + Number(it.quantity) * Number(it.price), 0),
    0,
  );

  return {
    asOf,
    cash,
    accountsReceivable,
    inventoryValue,
    accountsPayable,
    netAssets: cash + accountsReceivable + inventoryValue - accountsPayable,
  };
}
