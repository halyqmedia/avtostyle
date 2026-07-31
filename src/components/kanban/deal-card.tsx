"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

export function DealCard({ deal, disabled }: { deal: KanbanDeal; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    disabled,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const remainder = deal.amount - deal.prepayment;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      data-testid="deal-card"
      data-deal-id={deal.id}
      className={cn(
        "flex touch-none cursor-grab select-none flex-col gap-1.5 rounded-lg border bg-background p-3 text-sm shadow-sm active:cursor-grabbing",
        isDragging && "z-10 opacity-60 shadow-md",
      )}
    >
      <Link href={`/crm/deals/${deal.id}`} className="font-medium leading-tight hover:underline">
        {deal.title}
      </Link>
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
    </div>
  );
}
