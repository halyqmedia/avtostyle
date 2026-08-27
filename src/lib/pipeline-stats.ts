import "server-only";
import { prisma } from "@/lib/prisma";

export interface PipelineStats {
  totalCount: number;
  /** New deals created in the last 7 days vs the 7 days before — a real, fair week-over-week signal. */
  newLeadsThisWeek: number;
  newLeadsTrendPct: number | null;
  pipelineValue: number;
  soldThisMonth: number;
  /** All-time WON / (WON + LOST) for this funnel — no fabricated time window. */
  conversionPct: number | null;
}

function startOfMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Real, non-fabricated pipeline metrics for one funnel, respecting the same visibility rule the CRM board already uses. */
export async function getPipelineStats(opts: { funnelKey: string; assignedToId?: string }): Promise<PipelineStats> {
  const { funnelKey, assignedToId } = opts;
  const visibility = assignedToId ? { assignedToId } : {};

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [activeDeals, newLeadsThisWeek, newLeadsPriorWeek, soldPayments, wonCount, lostCount] = await Promise.all([
    prisma.deal.findMany({
      where: { pipelineStage: { pipeline: funnelKey, isFinal: false }, ...visibility },
      select: { amount: true },
    }),
    prisma.deal.count({
      where: { pipelineStage: { pipeline: funnelKey }, createdAt: { gte: weekAgo }, ...visibility },
    }),
    prisma.deal.count({
      where: {
        pipelineStage: { pipeline: funnelKey },
        createdAt: { gte: twoWeeksAgo, lt: weekAgo },
        ...visibility,
      },
    }),
    prisma.transaction.findMany({
      where: {
        type: "INCOME",
        category: "sales_payment",
        date: { gte: startOfMonth() },
        deal: { pipelineStage: { pipeline: funnelKey }, ...visibility },
      },
      select: { amount: true },
    }),
    prisma.deal.count({ where: { pipelineStage: { pipeline: funnelKey, key: "WON" }, ...visibility } }),
    prisma.deal.count({ where: { pipelineStage: { pipeline: funnelKey, key: "LOST" }, ...visibility } }),
  ]);

  const pipelineValue = activeDeals.reduce((s, d) => s + Number(d.amount), 0);
  const soldThisMonth = soldPayments.reduce((s, p) => s + Number(p.amount), 0);
  const decided = wonCount + lostCount;

  return {
    totalCount: activeDeals.length,
    newLeadsThisWeek,
    // A percentage off a tiny denominator (1-2 leads) swings wildly and reads as broken, not
    // insightful — only show the trend once last week's base is large enough to be meaningful.
    newLeadsTrendPct:
      newLeadsPriorWeek >= 5 ? ((newLeadsThisWeek - newLeadsPriorWeek) / newLeadsPriorWeek) * 100 : null,
    pipelineValue,
    soldThisMonth,
    conversionPct: decided > 0 ? (wonCount / decided) * 100 : null,
  };
}
