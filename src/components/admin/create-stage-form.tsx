"use client";

import { useActionState, useState } from "react";
import { createStage } from "@/actions/pipeline-stages";
import { ColorSwatchPicker } from "@/components/admin/color-swatch-picker";
import { STAGE_COLOR_PALETTE } from "@/lib/stage-colors";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function CreateStageForm({ pipeline }: { pipeline: string }) {
  const [state, formAction, pending] = useActionState(createStage, undefined);
  const [color, setColor] = useState(STAGE_COLOR_PALETTE[0]);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-dashed p-3">
      <input type="hidden" name="pipeline" value={pipeline} />
      <input type="hidden" name="color" value={color} />
      <div className="flex flex-col gap-1.5 sm:max-w-xs">
        <Input name="name" placeholder="Жаңа кезең атауы" required />
      </div>
      <ColorSwatchPicker value={color} onChange={setColor} />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="self-start" variant="secondary">
        {pending ? "Қосылуда..." : "+ Кезең қосу"}
      </Button>
    </form>
  );
}
