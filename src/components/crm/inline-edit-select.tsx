"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EMPTY = "__empty__";

export function InlineEditSelect({
  label,
  value,
  displayValue,
  options,
  onSave,
  disabled,
  allowEmpty,
  emptyLabel = "—",
}: {
  label: string;
  value: string | null;
  displayValue: string;
  options: { value: string; label: string }[];
  onSave: (newValue: string | null) => Promise<void>;
  disabled?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleChange(newValue: string) {
    startTransition(async () => {
      try {
        await onSave(newValue === EMPTY ? null : newValue);
        setEditing(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Сақтау сәтсіз аяқталды");
      }
    });
  }

  return (
    <div className="group/field">
      <p className="text-muted-foreground">{label}</p>
      {editing ? (
        <Select
          defaultValue={value ?? EMPTY}
          onValueChange={handleChange}
          disabled={pending}
          open
          onOpenChange={(open) => !open && setEditing(false)}
        >
          <SelectTrigger size="sm" className="mt-0.5 h-7 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {allowEmpty && <SelectItem value={EMPTY}>{emptyLabel}</SelectItem>}
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setEditing(true)}
          className={cn(
            "flex items-center gap-1.5 rounded px-0.5 -mx-0.5 font-medium",
            !disabled && "hover:bg-muted",
          )}
        >
          {displayValue}
          {!disabled && (
            <Pencil className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover/field:opacity-100" />
          )}
        </button>
      )}
    </div>
  );
}
