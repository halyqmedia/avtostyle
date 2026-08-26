"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateWhatsAppNumberFunnel, updateWhatsAppNumberManager } from "@/actions/whatsapp-numbers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const UNASSIGNED = "__unassigned__";

export function WhatsAppNumberRow({
  number,
  funnels,
  managers,
}: {
  number: { id: string; phoneNumberId: string; label: string; funnelId: string; managerId: string | null };
  funnels: { id: string; name: string }[];
  managers: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium">{number.label}</p>
        <p className="text-xs text-muted-foreground">{number.phoneNumberId}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select
          defaultValue={number.funnelId}
          disabled={pending}
          onValueChange={(v) => startTransition(async () => {
            try {
              await updateWhatsAppNumberFunnel(number.id, v);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Сақталмады");
            }
          })}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Воронка" />
          </SelectTrigger>
          <SelectContent>
            {funnels.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          defaultValue={number.managerId ?? UNASSIGNED}
          disabled={pending}
          onValueChange={(v) => startTransition(async () => {
            try {
              await updateWhatsAppNumberManager(number.id, v === UNASSIGNED ? null : v);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Сақталмады");
            }
          })}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Менеджер" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>— Бекітілмеген —</SelectItem>
            {managers.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
