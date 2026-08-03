"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

export type KanbanProductionOrder = {
  id: string;
  clientName: string;
  clientPhone: string;
  carBrand: string | null;
  itemsSummary: string;
};

export function ProductionOrderCard({ order, disabled }: { order: KanbanProductionOrder; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id,
    disabled,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      data-testid="production-order-card"
      data-order-id={order.id}
      className={cn(
        "flex touch-none cursor-grab select-none flex-col gap-1.5 rounded-lg border bg-background p-3 text-sm shadow-sm active:cursor-grabbing",
        isDragging && "z-10 opacity-60 shadow-md",
      )}
    >
      <Link href={`/production/orders/${order.id}`} className="font-medium leading-tight hover:underline">
        {order.clientName}
      </Link>
      <p className="text-xs text-muted-foreground">{order.clientPhone}</p>
      {order.carBrand && <p className="text-xs text-muted-foreground">{order.carBrand}</p>}
      <p className="text-xs text-muted-foreground">{order.itemsSummary}</p>
    </div>
  );
}
