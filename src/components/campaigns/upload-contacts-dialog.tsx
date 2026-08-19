"use client";

import { useState, useTransition } from "react";
import { uploadContacts } from "@/actions/contacts";
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

export function UploadContactsDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await uploadContacts(undefined, formData);
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
        <Button>+ База жүктеу</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Клиенттер базасын жүктеу</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contactsFile">Файл (.csv/.txt)</Label>
            <Input id="contactsFile" name="contactsFile" type="file" accept=".csv,.txt" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contactsText">Немесе тікелей қойыңыз</Label>
            <textarea
              id="contactsText"
              name="contactsText"
              rows={6}
              placeholder={"+77011234567, Айгерім, Алматы, дизайнер, VIP, Жаңа, тег1|тег2\n+77021234567, Дәулет"}
              className="w-full resize-none rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <p className="text-xs text-muted-foreground">
              Әр жолда: телефон, аты, қала, кәсіп, бағыт, статус, тег(лер, &quot;|&quot; арқылы) — соңғы бағандар міндетті емес.
              Бұрыннан бар нөмір қайта жүктелсе, деректері жаңарады.
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Жүктелуде..." : "Жүктеу"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
