"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { DealCard, type KanbanDeal } from "@/components/kanban/deal-card";

export type KanbanStage = {
  id: string;
  name: string;
  color: string;
};

export function KanbanColumn({
  stage,
  deals,
  canMove,
}: {
  stage: KanbanStage;
  deals: KanbanDeal[];
  canMove: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}
      data-testid="kanban-column"
      data-stage-id={stage.id}
      className={cn(
        "flex h-full w-72 shrink-0 flex-col overflow-hidden rounded-lg border bg-muted/20 transition-colors",
        isOver && "ring-2 ring-ring",
      )}
    >
      <div
        className="flex shrink-0 items-center justify-between rounded-t-lg border-b px-3 py-2"
        style={{ backgroundColor: `${stage.color}22`, borderColor: `${stage.color}55` }}
      >
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
          <span className="text-sm font-semibold">{stage.name}</span>
        </div>
        <span className="text-xs text-muted-foreground">{deals.length}</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
        {deals.map((d) => (
          <DealCard key={d.id} deal={d} disabled={!canMove} />
        ))}
        {deals.length === 0 && (
          <p className="p-2 text-center text-xs text-muted-foreground/60">Бос</p>
        )}
      </div>
    </div>
  );
}
