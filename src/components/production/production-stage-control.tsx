"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { moveProductionOrderStage } from "@/actions/production-orders";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ProductionStageControl({
  orderId,
  currentStageId,
  stages,
}: {
  orderId: string;
  currentStageId: string;
  stages: { id: string; name: string; color: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleChange(toStageId: string) {
    if (toStageId === currentStageId) return;
    startTransition(async () => {
      try {
        const formData = new FormData();
        const file = fileInputRef.current?.files?.[0];
        if (file) formData.append("photo", file);
        await moveProductionOrderStage(orderId, toStageId, formData);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Статус ауыстырылмады");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Select value={currentStageId} onValueChange={handleChange} disabled={pending}>
        <SelectTrigger size="sm" className="w-52">
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
      <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        Кезең фотосы (міндетті емес)
        <input ref={fileInputRef} type="file" accept="image/*" className="w-40 text-xs" />
      </label>
    </div>
  );
}
