"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { ProductionOrderCard, type KanbanProductionOrder } from "@/components/kanban/production-order-card";
import type { KanbanStage } from "@/components/kanban/kanban-column";

export function ProductionKanbanColumn({
  stage,
  orders,
  canMove,
}: {
  stage: KanbanStage;
  orders: KanbanProductionOrder[];
  canMove: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}
      data-testid="production-kanban-column"
      data-stage-id={stage.id}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-lg border bg-muted/20 transition-colors",
        isOver && "ring-2 ring-ring",
      )}
    >
      <div
        className="flex items-center justify-between rounded-t-lg border-b px-3 py-2"
        style={{ backgroundColor: `${stage.color}22`, borderColor: `${stage.color}55` }}
      >
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
          <span className="text-sm font-semibold">{stage.name}</span>
        </div>
        <span className="text-xs text-muted-foreground">{orders.length}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-2">
        {orders.map((o) => (
          <ProductionOrderCard key={o.id} order={o} disabled={!canMove} />
        ))}
        {orders.length === 0 && (
          <p className="p-2 text-center text-xs text-muted-foreground/60">Бос</p>
        )}
      </div>
    </div>
  );
}
