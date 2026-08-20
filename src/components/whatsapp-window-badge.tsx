"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const WINDOW_HOURS = 24;

function remainingHours(lastInboundAt: string | null): number {
  if (!lastInboundAt) return 0;
  const elapsedMs = Date.now() - new Date(lastInboundAt).getTime();
  const remainingMs = WINDOW_HOURS * 3_600_000 - elapsedMs;
  return Math.max(0, Math.min(WINDOW_HOURS, Math.ceil(remainingMs / 3_600_000)));
}

/**
 * Meta's WhatsApp Cloud API only allows free-form replies within 24 hours of the client's last
 * inbound message — after that, only pre-approved template messages go through. This shows that
 * window as a small circle: green with hours left while open, gray once it's closed.
 */
export function WhatsAppWindowBadge({
  lastInboundAt,
  className,
}: {
  lastInboundAt: string | null;
  className?: string;
}) {
  const [prevLastInboundAt, setPrevLastInboundAt] = useState(lastInboundAt);
  const [hours, setHours] = useState(() => remainingHours(lastInboundAt));
  if (prevLastInboundAt !== lastInboundAt) {
    setPrevLastInboundAt(lastInboundAt);
    setHours(remainingHours(lastInboundAt));
  }

  useEffect(() => {
    const id = setInterval(() => setHours(remainingHours(lastInboundAt)), 60_000);
    return () => clearInterval(id);
  }, [lastInboundAt]);

  const isOpen = hours > 0;

  return (
    <span
      title={
        isOpen
          ? `WhatsApp терезесі ашық — шамамен ${hours} сағаттан кейін жабылады`
          : "WhatsApp терезесі жабық — тек шаблон хабарлама жіберуге болады"
      }
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums",
        isOpen
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          : "bg-muted text-muted-foreground",
        className,
      )}
    >
      {hours}С
    </span>
  );
}
