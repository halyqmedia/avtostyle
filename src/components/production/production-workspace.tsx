"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { moveProductionOrderStage } from "@/actions/production-orders";
import { ProductionKanbanBoard } from "@/components/kanban/production-kanban-board";
import type { KanbanStage } from "@/components/kanban/kanban-column";
import type { KanbanProductionOrder } from "@/components/kanban/production-order-card";

type WorkspaceOrder = KanbanProductionOrder & { stageId: string };

export function ProductionWorkspace({
  stages,
  initialOrders,
  canMove,
}: {
  stages: KanbanStage[];
  initialOrders: WorkspaceOrder[];
  canMove: boolean;
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [, startTransition] = useTransition();

  function handleMoveOrder(orderId: string, toStageId: string) {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const fromStageId = order.stageId;

    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, stageId: toStageId } : o)));

    startTransition(async () => {
      try {
        await moveProductionOrderStage(orderId, toStageId);
      } catch {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, stageId: fromStageId } : o)));
        toast.error("Заявканы жылжыту сәтсіз аяқталды");
      }
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <ProductionKanbanBoard stages={stages} orders={orders} canMove={canMove} onMoveOrder={handleMoveOrder} />
    </div>
  );
}
