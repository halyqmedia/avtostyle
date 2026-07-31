"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { moveDealStage } from "@/actions/deals";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { CrmFilters, type CrmFiltersState } from "@/components/crm/crm-filters";
import type { KanbanStage } from "@/components/kanban/kanban-column";
import type { KanbanDeal } from "@/components/kanban/deal-card";

type WorkspaceDeal = KanbanDeal & { stageId: string };

export function CrmWorkspace({
  stages,
  initialDeals,
  canMove,
  assignees,
  products,
  showAssigneeFilter,
}: {
  stages: KanbanStage[];
  initialDeals: WorkspaceDeal[];
  canMove: boolean;
  assignees: { id: string; name: string }[];
  products: { id: string; name: string }[];
  showAssigneeFilter: boolean;
}) {
  const [deals, setDeals] = useState(initialDeals);
  const [, startTransition] = useTransition();
  const [filters, setFilters] = useState<CrmFiltersState>({
    search: "",
    assignedToId: null,
    productId: null,
    source: null,
  });

  const sources = useMemo(
    () => Array.from(new Set(deals.map((d) => d.source).filter((s): s is string => !!s))),
    [deals],
  );

  const filteredDeals = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return deals.filter((d) => {
      if (filters.assignedToId && d.assignedToId !== filters.assignedToId) return false;
      if (filters.productId && d.productId !== filters.productId) return false;
      if (filters.source && d.source !== filters.source) return false;
      if (search) {
        const haystack = [d.title, d.clientName, d.clientPhone, d.productName, d.assigneeName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }, [deals, filters]);

  function handleMoveDeal(dealId: string, toStageId: string) {
    const deal = deals.find((d) => d.id === dealId);
    if (!deal) return;
    const fromStageId = deal.stageId;

    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stageId: toStageId } : d)));

    startTransition(async () => {
      try {
        await moveDealStage(dealId, toStageId);
      } catch {
        setDeals((prev) =>
          prev.map((d) => (d.id === dealId ? { ...d, stageId: fromStageId } : d)),
        );
        toast.error("Сделканы жылжыту сәтсіз аяқталды");
      }
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <CrmFilters
        value={filters}
        onChange={setFilters}
        assignees={assignees}
        products={products}
        sources={sources}
        showAssigneeFilter={showAssigneeFilter}
        visibleCount={filteredDeals.length}
        totalCount={deals.length}
      />
      <KanbanBoard
        stages={stages}
        deals={filteredDeals}
        canMove={canMove}
        onMoveDeal={handleMoveDeal}
      />
    </div>
  );
}
