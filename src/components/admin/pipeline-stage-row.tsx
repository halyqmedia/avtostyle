"use client";

import { useState, useTransition } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { updateStageColor, updateStageName, reorderStage } from "@/actions/pipeline-stages";
import { ColorSwatchPicker } from "@/components/admin/color-swatch-picker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function PipelineStageRow({
  stage,
  isFirst,
  isLast,
}: {
  stage: { id: string; pipeline: string; name: string; color: string; isFinal: boolean };
  isFirst: boolean;
  isLast: boolean;
}) {
  const [name, setName] = useState(stage.name);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="size-4 shrink-0 rounded-full" style={{ backgroundColor: stage.color }} />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (name.trim() && name !== stage.name) {
              startTransition(() => updateStageName(stage.id, name.trim()));
            }
          }}
          className="h-8 w-48"
        />
        {stage.isFinal && <Badge variant="secondary">финал</Badge>}
      </div>
      <div className="flex items-center gap-3">
        <ColorSwatchPicker
          value={stage.color}
          onChange={(color) => startTransition(() => updateStageColor(stage.id, color))}
        />
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            disabled={pending || isFirst}
            onClick={() => startTransition(() => reorderStage(stage.pipeline, stage.id, "up"))}
          >
            <ArrowUp className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={pending || isLast}
            onClick={() => startTransition(() => reorderStage(stage.pipeline, stage.id, "down"))}
          >
            <ArrowDown className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
