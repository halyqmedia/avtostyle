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
        "flex h-full w-72 shrink-0 flex-col overflow-hidden rounded-2xl border bg-card/40 backdrop-blur-sm transition-shadow",
        isOver && "ring-2 ring-primary/50",
      )}
    >
      <div
        className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b px-3.5 py-2.5 backdrop-blur-md"
        style={{ backgroundColor: `${stage.color}14`, borderColor: `${stage.color}40` }}
      >
        <div className="flex items-center gap-2">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: stage.color, boxShadow: `0 0 6px 1px ${stage.color}80` }}
          />
          <span className="text-sm font-semibold">{stage.name}</span>
        </div>
        <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
          {deals.length}
        </span>
      </div>
      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
        {deals.map((d) => (
          <DealCard key={d.id} deal={d} disabled={!canMove} />
        ))}
        {deals.length === 0 && (
          <div className="flex flex-col items-center gap-1 p-4 text-center">
            <p className="text-xs text-muted-foreground/60">Бұл кезеңде мәміле жоқ</p>
          </div>
        )}
      </div>
    </div>
  );
}
