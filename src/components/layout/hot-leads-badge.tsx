"use client";

import { useQuery } from "@tanstack/react-query";
import { getHotLeadsCount } from "@/actions/deals";

export function HotLeadsBadge() {
  const { data } = useQuery({
    queryKey: ["hot-leads-count"],
    queryFn: () => getHotLeadsCount(),
    refetchInterval: 60_000,
  });

  if (!data) return null;

  return (
    <span className="ml-auto flex size-4.5 shrink-0 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
      {data > 9 ? "9+" : data}
    </span>
  );
}
