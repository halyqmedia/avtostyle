"use client";

import { useActionState } from "react";
import { createWhatsAppNumber } from "@/actions/whatsapp-numbers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CreateWhatsAppNumberForm({
  funnels,
  managers,
}: {
  funnels: { id: string; name: string }[];
  managers: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createWhatsAppNumber, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-dashed p-3">
      <p className="text-xs text-muted-foreground">
        Phone Number ID Meta Business Manager → WhatsApp Manager → API Setup бетінен алынады (жаңа
        нөмір алдымен сол жерде қосылуы керек).
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phoneNumberId">Phone Number ID (Meta)</Label>
          <Input id="phoneNumberId" name="phoneNumberId" placeholder="mыс. 1224963974037350" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="label">Ат (админ үшін)</Label>
          <Input id="label" name="label" placeholder="мыс. ТПЕ 2 нөмірі" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Воронка</Label>
          <Select name="funnelId" required>
            <SelectTrigger>
              <SelectValue placeholder="Таңдаңыз" />
            </SelectTrigger>
            <SelectContent>
              {funnels.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Менеджер (міндетті емес)</Label>
          <Select name="managerId">
            <SelectTrigger>
              <SelectValue placeholder="Бекітілмеген" />
            </SelectTrigger>
            <SelectContent>
              {managers.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="accessToken">Access token override (міндетті емес)</Label>
          <Input
            id="accessToken"
            name="accessToken"
            placeholder="Бос қалдырсаңыз — WHATSAPP_CLOUD_ACCESS_TOKEN env қолданылады"
          />
        </div>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Қосылуда..." : "+ Нөмір қосу"}
      </Button>
    </form>
  );
}
