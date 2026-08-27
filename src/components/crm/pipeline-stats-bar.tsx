import { TrendingUp, TrendingDown } from "lucide-react";
import type { PipelineStats } from "@/lib/pipeline-stats";

function formatMoney(n: number) {
  if (n >= 1_000_000) return `₸ ${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  return `₸ ${new Intl.NumberFormat("ru-RU").format(Math.round(n))}`;
}

function StatCard({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend?: { pct: number; suffix: string } | null;
}) {
  return (
    <div className="flex min-w-40 flex-1 flex-col gap-1 rounded-xl border bg-card px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-semibold tracking-tight">{value}</span>
        {trend && trend.pct !== 0 && (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium ${trend.pct > 0 ? "text-emerald-600" : "text-destructive"}`}
          >
            {trend.pct > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {Math.abs(trend.pct).toFixed(1)}% {trend.suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export function PipelineStatsBar({ stats }: { stats: PipelineStats }) {
  return (
    <div className="flex flex-wrap gap-3">
      <StatCard
        label="Барлық мәмілелер"
        value={String(stats.totalCount)}
        trend={stats.newLeadsTrendPct !== null ? { pct: stats.newLeadsTrendPct, suffix: "жаңа лид/апта" } : null}
      />
      <StatCard label="Pipeline көлемі" value={formatMoney(stats.pipelineValue)} />
      <StatCard label="Осы айда сатылды" value={formatMoney(stats.soldThisMonth)} />
      <StatCard
        label="Конверсия (барлық уақыт)"
        value={stats.conversionPct !== null ? `${stats.conversionPct.toFixed(1)}%` : "—"}
      />
    </div>
  );
}
