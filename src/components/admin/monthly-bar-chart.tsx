function formatValue(n: number) {
  return new Intl.NumberFormat("ru-RU").format(Math.round(n));
}

/** Dependency-free CSS bar chart — proportional bar heights, no charting library needed. */
export function MonthlyBarChart({
  data,
  color = "#3B82F6",
  suffix = "",
}: {
  data: { label: string; value: number }[];
  color?: string;
  suffix?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="flex h-40 items-end gap-2">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-xs font-medium">
            {formatValue(d.value)}
            {suffix}
          </span>
          <div
            className="w-full rounded-t-sm"
            style={{
              height: `${Math.max(2, (d.value / max) * 100)}px`,
              backgroundColor: color,
              opacity: d.value === 0 ? 0.15 : 1,
            }}
          />
          <span className="text-[11px] text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
