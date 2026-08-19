"use client";

import { useState, useTransition } from "react";
import { createCampaign } from "@/actions/campaigns";
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

export type ApprovedTemplateOption = { id: string; name: string; bodyText: string };

export function CreateCampaignDialog({ templates }: { templates: ApprovedTemplateOption[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createCampaign(undefined, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setError(undefined);
        setOpen(false);
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
        <Button disabled={templates.length === 0}>+ Жаңа рассылка</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Жаңа рассылка</DialogTitle>
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contactsFile">База файлы (.csv/.txt: телефон[, аты])</Label>
            <Input id="contactsFile" name="contactsFile" type="file" accept=".csv,.txt" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contactsText">Немесе тікелей қойыңыз (әр жолда: телефон, аты)</Label>
            <textarea
              id="contactsText"
              name="contactsText"
              rows={5}
              placeholder={"+77011234567, Айгерім\n+77021234567, Дәулет"}
              className="w-full resize-none rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Жүктелуде..." : "Базаны жүктеу"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
