"use client";

import { useState, useTransition } from "react";
import { createTemplate } from "@/actions/campaigns";
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

export function CreateTemplateDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [bodyText, setBodyText] = useState("");
  const [pending, startTransition] = useTransition();

  const hasVariable = /\{\{1\}\}/.test(bodyText);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createTemplate(undefined, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setError(undefined);
        setOpen(false);
        setBodyText("");
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
        <Button variant="outline">+ Жаңа шаблон</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Жаңа WhatsApp шаблоны</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Шаблон аты (тек латын әріптер, сан, _)</Label>
            <Input id="name" name="name" placeholder="autumn_promo" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="language">Тіл</Label>
              <Select name="language" defaultValue="kk">
                <SelectTrigger id="language" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kk">Қазақша</SelectItem>
                  <SelectItem value="ru">Орысша</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Санат</Label>
              <Select name="category" defaultValue="MARKETING">
                <SelectTrigger id="category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="UTILITY">Utility</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bodyText">Мәтін (аты үшін {"{{1}}"} қоюға болады)</Label>
            <textarea
              id="bodyText"
              name="bodyText"
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows={4}
              placeholder="Сәлеметсіз бе, {{1}}! Avtostyle-да күзгі акция басталды..."
              className="w-full resize-none rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              required
            />
          </div>
          {hasVariable && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="example">{"{{1}}"} үшін мысал мән (Meta тексеруі үшін керек)</Label>
              <Input id="example" name="example" placeholder="Айгерім" required />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Жіберілуде..." : "Meta-ға тексеруге жіберу"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
