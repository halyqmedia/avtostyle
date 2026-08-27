"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { Flame, Phone } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { WhatsAppWindowBadge } from "@/components/whatsapp-window-badge";
import { cn } from "@/lib/utils";

export type KanbanDeal = {
  id: string;
  title: string;
  clientName: string;
  clientPhone: string | null;
  productId: string | null;
  productName: string | null;
  amount: number;
  prepayment: number;
  assignedToId: string | null;
  assigneeName: string | null;
  source: string | null;
  aiTemperature: string | null;
  lastInboundAt: string | null;
};

function formatMoney(n: number) {
  return new Intl.NumberFormat("ru-RU").format(n) + " ₸";
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Pure presentational card markup — shared by the draggable in-column card and the floating DragOverlay clone. */
function DealCardBody({ deal, className }: { deal: KanbanDeal; className?: string }) {
  const remainder = deal.amount - deal.prepayment;

  return (
    <div
      data-testid="deal-card"
      data-deal-id={deal.id}
      className={cn(
        "group flex select-none flex-col gap-1.5 rounded-xl border bg-card p-3 text-sm shadow-sm",
        deal.aiTemperature === "HOT" && "border-l-2 border-l-destructive",
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        <Link href={`/crm/deals/${deal.id}`} className="min-w-0 flex-1 truncate font-medium leading-tight hover:underline">
          {deal.title}
        </Link>
        {deal.aiTemperature === "HOT" && (
          <Flame className="size-3.5 shrink-0 text-destructive" aria-label="Қызып тұрған лид" />
        )}
        {deal.source === "whatsapp" && <WhatsAppWindowBadge lastInboundAt={deal.lastInboundAt} />}
      </div>
      <p className="text-xs text-muted-foreground">{deal.clientName}</p>
      {deal.productName && <p className="text-xs text-muted-foreground">{deal.productName}</p>}
      <div className="mt-1 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-semibold">{formatMoney(deal.amount)}</span>
          {deal.prepayment > 0 && (
            <span className="text-[11px] text-muted-foreground">
              Алдын ала: {formatMoney(deal.prepayment)} · Қалдық: {formatMoney(remainder)}
            </span>
          )}
        </div>
        {deal.assigneeName && (
          <Avatar className="size-6">
            <AvatarFallback className="text-[10px]">{initials(deal.assigneeName)}</AvatarFallback>
          </Avatar>
        )}
      </div>
      {deal.clientPhone && (
        <div className="max-h-0 overflow-hidden opacity-0 transition-all duration-150 group-hover:max-h-8 group-hover:opacity-100">
          <a
            href={`tel:${deal.clientPhone}`}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Phone className="size-3" />
            {deal.clientPhone}
          </a>
        </div>
      )}
    </div>
  );
}

export function DealCard({ deal, disabled }: { deal: KanbanDeal; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: deal.id,
    disabled,
  });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className="touch-none">
      <DealCardBody
        deal={deal}
        className={cn(
          "cursor-grab transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md active:cursor-grabbing",
          isDragging && "opacity-30",
        )}
      />
    </div>
  );
}

/** Floating clone rendered inside dnd-kit's <DragOverlay> — no drag hooks, just the visual, with a slight scale/shadow lift. */
export function DealCardOverlay({ deal }: { deal: KanbanDeal }) {
  return <DealCardBody deal={deal} className="scale-[1.03] cursor-grabbing shadow-xl ring-1 ring-primary/20" />;
}
