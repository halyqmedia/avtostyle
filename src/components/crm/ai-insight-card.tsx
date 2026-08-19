import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function AIInsightCard({
  icon: Icon,
  title,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {Icon && <Icon className="size-3" />}
        {title}
      </p>
      <div className="text-sm leading-snug">{children}</div>
    </div>
  );
}
