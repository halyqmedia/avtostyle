"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { createSequence } from "@/actions/sequences";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ApprovedTemplateOption } from "@/components/campaigns/create-campaign-from-selection-dialog";

type StepDraft = { templateId: string; delayDays: number };

export function CreateSequenceDialog({ templates }: { templates: ApprovedTemplateOption[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [steps, setSteps] = useState<StepDraft[]>([{ templateId: "", delayDays: 0 }]);
  const [pending, startTransition] = useTransition();

  function addStep() {
    setSteps((prev) => [...prev, { templateId: "", delayDays: 3 }]);
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function updateStep(index: number, patch: Partial<StepDraft>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function handleSubmit(formData: FormData) {
    formData.set("stepsJson", JSON.stringify(steps));
    startTransition(async () => {
      const result = await createSequence(undefined, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setError(undefined);
        setOpen(false);
        setSteps([{ templateId: "", delayDays: 0 }]);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(undefined);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" disabled={templates.length === 0}>
          + Жаңа тізбек
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Жаңа автоматты тізбек</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Тізбек аты</Label>
            <Input id="name" name="name" placeholder="B2B бірінші контакт" required />
          </div>

          <div className="flex flex-col gap-3">
            <Label>Қадамдар (жауап келсе тоқтайды)</Label>
            {steps.map((step, i) => (
              <div key={i} className="flex items-end gap-2 rounded-md border p-2">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">{i + 1}-хат — шаблон</Label>
                  <Select value={step.templateId} onValueChange={(v) => updateStep(i, { templateId: v })}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Шаблон таңдаңыз" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex w-28 flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {i === 0 ? "Тіркелгеннен" : "Алдыңғыдан"} кейін, күн
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={step.delayDays}
                    onChange={(e) => updateStep(i, { delayDays: Number(e.target.value) || 0 })}
                  />
                </div>
                {steps.length > 1 && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeStep(i)}>
                    <X className="size-3.5" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" size="sm" variant="ghost" onClick={addStep} className="self-start">
              <Plus className="size-3.5" />
              Қадам қосу
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Сақталуда..." : "Тізбек жасау"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
