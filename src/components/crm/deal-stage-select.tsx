"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { moveDealStage } from "@/actions/deals";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DealStageSelect({
  dealId,
  currentStageId,
  stages,
  disabled,
}: {
  dealId: string;
  currentStageId: string;
  stages: { id: string; name: string; color: string }[];
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleChange(toStageId: string) {
    if (toStageId === currentStageId) return;
    startTransition(async () => {
      try {
        await moveDealStage(dealId, toStageId);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Статусты өзгерту сәтсіз аяқталды");
      }
    });
  }

  return (
    <Select value={currentStageId} onValueChange={handleChange} disabled={disabled || pending}>
      <SelectTrigger size="sm" className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {stages.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
