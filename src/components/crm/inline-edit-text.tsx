"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function InlineEditText({
  label,
  value,
  displayValue,
  type = "text",
  onSave,
  disabled,
}: {
  label: string;
  value: string;
  displayValue?: string;
  type?: "text" | "number";
  onSave: (newValue: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function save() {
    if (draft.trim() === "" || draft === value) {
      setEditing(false);
      setDraft(value);
      return;
    }
    startTransition(async () => {
      try {
        await onSave(draft);
        setEditing(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Сақтау сәтсіз аяқталды");
      }
    });
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  return (
    <div className="group/field">
      <p className="text-muted-foreground">{label}</p>
      {editing ? (
        <div className="mt-0.5 flex items-center gap-1">
          <input
            ref={inputRef}
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") cancel();
            }}
            disabled={pending}
            className="h-7 w-full min-w-0 rounded-md border border-input bg-background px-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="shrink-0 text-muted-foreground hover:text-primary"
          >
            <Check className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setDraft(value);
            setEditing(true);
          }}
          className={cn(
            "flex items-center gap-1.5 rounded px-0.5 -mx-0.5 font-medium",
            !disabled && "hover:bg-muted",
          )}
        >
          {displayValue ?? (value || "—")}
          {!disabled && (
            <Pencil className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover/field:opacity-100" />
          )}
        </button>
      )}
    </div>
  );
}
