"use client";

import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { ProductionKanbanColumn } from "@/components/kanban/production-kanban-column";
import type { KanbanStage } from "@/components/kanban/kanban-column";
import type { KanbanProductionOrder } from "@/components/kanban/production-order-card";

export function ProductionKanbanBoard({
  stages,
  orders,
  canMove,
  onMoveOrder,
}: {
  stages: KanbanStage[];
  orders: (KanbanProductionOrder & { stageId: string })[];
  canMove: boolean;
  onMoveOrder: (orderId: string, toStageId: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    if (!canMove) return;
    const { active, over } = event;
    if (!over) return;

    const orderId = String(active.id);
    const toStageId = String(over.id);
    const order = orders.find((o) => o.id === orderId);
    if (!order || order.stageId === toStageId) return;

    onMoveOrder(orderId, toStageId);
  }

  return (
    <DndContext id="production-kanban-board" sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-1 gap-3 overflow-x-auto pb-2">
        {stages.map((stage) => (
          <ProductionKanbanColumn
            key={stage.id}
            stage={stage}
            orders={orders.filter((o) => o.stageId === stage.id)}
            canMove={canMove}
          />
        ))}
      </div>
    </DndContext>
  );
}
