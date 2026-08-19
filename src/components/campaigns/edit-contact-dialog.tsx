"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { updateContact } from "@/actions/contacts";
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

export type ContactRow = {
  id: string;
  phone: string;
  fullName: string | null;
  city: string | null;
  profession: string | null;
  category: string | null;
  status: string | null;
  tags: string[];
  notes: string | null;
};

export function EditContactDialog({ contact }: { contact: ContactRow }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await updateContact(contact.id, formData);
        setOpen(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Сақталмады");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Pencil className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{contact.phone}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName">Аты-жөні</Label>
              <Input id="fullName" name="fullName" defaultValue={contact.fullName ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="city">Қаласы</Label>
              <Input id="city" name="city" defaultValue={contact.city ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profession">Кәсібі</Label>
              <Input id="profession" name="profession" defaultValue={contact.profession ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Бағыты</Label>
              <Input id="category" name="category" defaultValue={contact.category ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status">Статус</Label>
              <Input id="status" name="status" defaultValue={contact.status ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tags">Тегтер (үтірмен)</Label>
              <Input id="tags" name="tags" defaultValue={contact.tags.join(", ")} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Ескертпе</Label>
            <textarea
              id="notes"
              name="notes"
              defaultValue={contact.notes ?? ""}
              rows={3}
              className="w-full resize-none rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Сақталуда..." : "Сақтау"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
