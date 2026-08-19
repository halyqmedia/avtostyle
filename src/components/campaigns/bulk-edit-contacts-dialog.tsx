"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { bulkUpdateContacts } from "@/actions/contacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Fields = { city: string; profession: string; category: string; status: string; addTags: string };
const EMPTY: Fields = { city: "", profession: "", category: "", status: "", addTags: "" };

export function BulkEditContactsDialog({
  open,
  onOpenChange,
  selectedIds,
  onApplied,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onApplied: () => void;
}) {
  const [step, setStep] = useState<"edit" | "confirm">("edit");
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [pending, startTransition] = useTransition();

  function reset() {
    setStep("edit");
    setFields(EMPTY);
  }

  function handleNext() {
    if (!fields.city && !fields.profession && !fields.category && !fields.status && !fields.addTags.trim()) {
      toast.error("Кемінде бір өрісті толтырыңыз");
      return;
    }
    setStep("confirm");
  }

  function handleConfirm() {
    startTransition(async () => {
      const formData = new FormData();
      if (fields.city) formData.set("city", fields.city);
      if (fields.profession) formData.set("profession", fields.profession);
      if (fields.category) formData.set("category", fields.category);
      if (fields.status) formData.set("status", fields.status);
      if (fields.addTags) formData.set("addTags", fields.addTags);

      const result = await bulkUpdateContacts(selectedIds, formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${result?.updated ?? selectedIds.length} клиент жаңартылды`);
      reset();
      onOpenChange(false);
      onApplied();
    });
  }

  const changes = [
    fields.city && `Қала → ${fields.city}`,
    fields.profession && `Кәсіп → ${fields.profession}`,
    fields.category && `Бағыт → ${fields.category}`,
    fields.status && `Статус → ${fields.status}`,
    fields.addTags.trim() && `Тег қосу → ${fields.addTags}`,
  ].filter((c): c is string => Boolean(c));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Жаппай өзгерту — {selectedIds.length} клиент</DialogTitle>
        </DialogHeader>

        {step === "edit" ? (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-muted-foreground">
              Тек толтырылған өрістер өзгереді, қалғандары әр клиентте сол қалпында қалады.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Қаласы</Label>
                <Input value={fields.city} onChange={(e) => setFields((f) => ({ ...f, city: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Кәсібі</Label>
                <Input
                  value={fields.profession}
                  onChange={(e) => setFields((f) => ({ ...f, profession: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Бағыты</Label>
                <Input
                  value={fields.category}
                  onChange={(e) => setFields((f) => ({ ...f, category: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Статус</Label>
                <Input value={fields.status} onChange={(e) => setFields((f) => ({ ...f, status: e.target.value }))} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Тег қосу (үтірмен, барлары сақталады)</Label>
              <Input value={fields.addTags} onChange={(e) => setFields((f) => ({ ...f, addTags: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button onClick={handleNext}>Жалғастыру</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm">
              <span className="font-medium">{selectedIds.length} клиентке</span> келесі өзгерістер қолданылады:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              {changes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <p className="text-sm text-destructive">Бұл әрекетті кері қайтару мүмкін емес. Растайсыз ба?</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("edit")} disabled={pending}>
                Артқа
              </Button>
              <Button onClick={handleConfirm} disabled={pending}>
                {pending ? "Қолданылуда..." : "Растау және қолдану"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
