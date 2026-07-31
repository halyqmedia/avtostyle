"use client";

import { STAGE_COLOR_PALETTE } from "@/lib/stage-colors";
import { cn } from "@/lib/utils";

export function ColorSwatchPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {STAGE_COLOR_PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={c}
          onClick={() => onChange(c)}
          className={cn(
            "size-6 rounded-full ring-offset-2 ring-offset-background transition-all",
            value === c && "ring-2 ring-foreground",
          )}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}
