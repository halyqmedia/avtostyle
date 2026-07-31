"use client";

import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { KanbanColumn, type KanbanStage } from "@/components/kanban/kanban-column";
import type { KanbanDeal } from "@/components/kanban/deal-card";

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

  function handleDragEnd(event: DragEndEvent) {
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
    <DndContext id="kanban-board" sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-1 gap-3 overflow-x-auto pb-2">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            deals={deals.filter((d) => d.stageId === stage.id)}
            canMove={canMove}
          />
        ))}
      </div>
    </DndContext>
  );
}
