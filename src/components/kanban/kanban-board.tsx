"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn, type KanbanStage } from "@/components/kanban/kanban-column";
import { DealCardOverlay, type KanbanDeal } from "@/components/kanban/deal-card";

export function KanbanBoard({
  stages,
  deals,
  canMove,
  onMoveDeal,
}: {
  stages: KanbanStage[];
  deals: (KanbanDeal & { stageId: string })[];
  canMove: boolean;
  onMoveDeal: (dealId: string, toStageId: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const [activeDealId, setActiveDealId] = useState<string | null>(null);
  const activeDeal = activeDealId ? deals.find((d) => d.id === activeDealId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveDealId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDealId(null);
    if (!canMove) return;
    const { active, over } = event;
    if (!over) return;

    const dealId = String(active.id);
    const toStageId = String(over.id);
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stageId === toStageId) return;

    onMoveDeal(dealId, toStageId);
  }

  return (
    <DndContext
      id="kanban-board"
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDealId(null)}
    >
      <div className="scrollbar-thin flex h-[calc(100dvh-230px)] min-h-[320px] gap-3 overflow-x-auto pb-2">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            deals={deals.filter((d) => d.stageId === stage.id)}
            canMove={canMove}
          />
        ))}
      </div>
      <DragOverlay>{activeDeal ? <DealCardOverlay deal={activeDeal} /> : null}</DragOverlay>
    </DndContext>
  );
}
