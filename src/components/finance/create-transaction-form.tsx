"use client";

import { useActionState } from "react";
import { createManualTransaction } from "@/actions/finance";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORIES = [
  { value: "salary", label: "Жалақы" },
  { value: "rent", label: "Жалдау (аренда)" },
  { value: "utilities", label: "Коммуналдық қызметтер" },
  { value: "commission", label: "Комиссия" },
  { value: "material_purchase", label: "Материал/шикізат" },
  { value: "other", label: "Басқа" },
];

export function CreateTransactionForm({ users }: { users: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createManualTransaction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-dashed p-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tx-type">Түрі</Label>
          <Select name="type" defaultValue="EXPENSE">
            <SelectTrigger id="tx-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INCOME">Кіріс</SelectItem>
              <SelectItem value="EXPENSE">Шығыс</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tx-category">Санаты</Label>
          <Select name="category" defaultValue="other">
            <SelectTrigger id="tx-category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tx-amount">Сома (₸)</Label>
          <Input id="tx-amount" name="amount" type="number" min={0} step="0.01" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tx-date">Күні</Label>
          <Input id="tx-date" name="date" type="date" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tx-user">Қызметкер (міндетті емес)</Label>
          <Select name="userId">
            <SelectTrigger id="tx-user" className="w-full">
              <SelectValue placeholder="Таңдамау" />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-3">
          <Label htmlFor="tx-desc">Сипаттама</Label>
          <Input id="tx-desc" name="description" placeholder="Мысалы: тамыз айының жалдау ақысы" />
        </div>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="self-start" variant="secondary">
        {pending ? "Сақталуда..." : "+ Транзакция қосу"}
      </Button>
    </form>
  );
}
