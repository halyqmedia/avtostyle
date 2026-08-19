"use client";

import { useState, useTransition } from "react";
import { createCampaign } from "@/actions/campaigns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type ApprovedTemplateOption = { id: string; name: string; bodyText: string };

export function CreateCampaignFromSelectionDialog({
  open,
  onOpenChange,
  selectedIds,
  templates,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  templates: ApprovedTemplateOption[];
  onCreated: () => void;
}) {
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    formData.set("contactIds", selectedIds.join(","));
    startTransition(async () => {
      const result = await createCampaign(undefined, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setError(undefined);
        onOpenChange(false);
        onCreated();
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setError(undefined);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Жаңа рассылка — {selectedIds.length} клиентке</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Рассылка аты</Label>
            <Input id="name" name="name" placeholder="Күзгі акция — тамыз" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="templateId">Шаблон</Label>
            <Select name="templateId" required>
              <SelectTrigger id="templateId" className="w-full">
                <SelectValue placeholder="Бекітілген шаблонды таңдаңыз" />
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
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending || templates.length === 0}>
              {pending ? "Жасалуда..." : "Рассылка жасау"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
