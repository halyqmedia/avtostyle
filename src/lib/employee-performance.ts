import "server-only";
import { prisma } from "@/lib/prisma";

function monthKey(d: Date) {
  return d.toISOString().slice(0, 7); // YYYY-MM
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("kk-KZ", { month: "short", year: "numeric" });
}

function monthsSince(monthsBack: number) {
  const now = new Date();
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (monthsBack - 1), 1));
  return since;
}

function buildSeries<T extends Record<string, number>>(
  since: Date,
  monthsBack: number,
  byMonth: Map<string, T>,
  zero: T,
): (T & { month: string; label: string })[] {
  const out: (T & { month: string; label: string })[] = [];
  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(Date.UTC(since.getUTCFullYear(), since.getUTCMonth() + i, 1));
    const key = monthKey(d);
    out.push({ ...(byMonth.get(key) ?? zero), month: key, label: monthLabel(key) });
  }
  return out;
}

export interface SalesMonth {
  month: string;
  label: string;
  salesTotal: number;
  dealsCount: number;
}

export async function getSalesPerformance(userId: string, monthsBack = 6): Promise<SalesMonth[]> {
  const since = monthsSince(monthsBack);
  const payments = await prisma.transaction.findMany({
    where: { type: "INCOME", category: "sales_payment", date: { gte: since }, deal: { assignedToId: userId } },
    select: { amount: true, date: true },
  });

  const byMonth = new Map<string, { salesTotal: number; dealsCount: number }>();
  for (const p of payments) {
    const key = monthKey(p.date);
    const row = byMonth.get(key) ?? { salesTotal: 0, dealsCount: 0 };
    row.salesTotal += Number(p.amount);
    row.dealsCount += 1;
    byMonth.set(key, row);
  }
  return buildSeries(since, monthsBack, byMonth, { salesTotal: 0, dealsCount: 0 });
}

export interface ProductionMonth {
  month: string;
  label: string;
  movesCount: number;
  completedCount: number;
}

export async function getProductionPerformance(userId: string, monthsBack = 6): Promise<ProductionMonth[]> {
  const since = monthsSince(monthsBack);
  const moves = await prisma.stageHistory.findMany({
    where: { movedById: userId, entityType: "PRODUCTION_ORDER", movedAt: { gte: since } },
    include: { toStage: true },
  });

  const byMonth = new Map<string, { movesCount: number; completedCount: number }>();
  for (const m of moves) {
    const key = monthKey(m.movedAt);
    const row = byMonth.get(key) ?? { movesCount: 0, completedCount: 0 };
    row.movesCount += 1;
    if (m.toStage.isFinal) row.completedCount += 1;
    byMonth.set(key, row);
  }
  return buildSeries(since, monthsBack, byMonth, { movesCount: 0, completedCount: 0 });
}

export interface EarningsMonth {
  month: string;
  label: string;
  commission: number;
  salary: number;
}

export async function getEarningsHistory(userId: string, monthsBack = 6): Promise<EarningsMonth[]> {
  const since = monthsSince(monthsBack);
  const txs = await prisma.transaction.findMany({
    where: { userId, type: "EXPENSE", category: { in: ["commission", "salary"] }, date: { gte: since } },
  });

  const byMonth = new Map<string, { commission: number; salary: number }>();
  for (const t of txs) {
    const key = monthKey(t.date);
    const row = byMonth.get(key) ?? { commission: 0, salary: 0 };
    if (t.category === "commission") row.commission += Number(t.amount);
    else row.salary += Number(t.amount);
    byMonth.set(key, row);
  }
  return buildSeries(since, monthsBack, byMonth, { commission: 0, salary: 0 });
}

export interface AuditEntry {
  id: string;
  movedAt: Date;
  entityType: string;
  label: string;
  fromStageName: string | null;
  toStageName: string;
  photoUrl: string | null;
}

export async function getUserAuditLog(userId: string, limit = 50): Promise<AuditEntry[]> {
  const moves = await prisma.stageHistory.findMany({
    where: { movedById: userId },
    include: { fromStage: true, toStage: true },
    orderBy: { movedAt: "desc" },
    take: limit,
  });
  if (moves.length === 0) return [];

  const dealIds = moves.filter((m) => m.entityType === "DEAL").map((m) => m.entityId);
  const orderIds = moves.filter((m) => m.entityType === "PRODUCTION_ORDER").map((m) => m.entityId);

  const [deals, orders] = await Promise.all([
    dealIds.length ? prisma.deal.findMany({ where: { id: { in: dealIds } }, select: { id: true, title: true } }) : [],
    orderIds.length
      ? prisma.productionOrder.findMany({ where: { id: { in: orderIds } }, select: { id: true, clientName: true } })
      : [],
  ]);
  const dealTitle = new Map(deals.map((d) => [d.id, d.title]));
  const orderLabel = new Map(orders.map((o) => [o.id, o.clientName]));

  return moves.map((m) => ({
    id: m.id,
    movedAt: m.movedAt,
    entityType: m.entityType,
    label:
      m.entityType === "DEAL"
        ? (dealTitle.get(m.entityId) ?? "Сделка")
        : (orderLabel.get(m.entityId) ?? "Өндіріс заявкасы"),
    fromStageName: m.fromStage?.name ?? null,
    toStageName: m.toStage.name,
    photoUrl: m.photoUrl,
  }));
}
