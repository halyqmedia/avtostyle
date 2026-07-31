"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createDeal } from "@/actions/deals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CreateDealForm({
  products,
  salesUsers,
}: {
  products: { id: string; name: string }[];
  salesUsers: { id: string; name: string }[] | null;
}) {
  const [state, formAction, pending] = useActionState(createDeal, undefined);
  const router = useRouter();

  useEffect(() => {
    if (state === undefined) return;
    if (!state.error) router.push("/crm");
  }, [state, router]);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Сделка атауы</Label>
        <Input id="title" name="title" placeholder="Мысалы: Camry үшін ковриктер" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="clientFullName">Клиент аты-жөні</Label>
          <Input id="clientFullName" name="clientFullName" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="clientPhone">Телефон</Label>
          <Input id="clientPhone" name="clientPhone" placeholder="+7 7XX XXX XXXX" required />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="productId">Өнім</Label>
        <Select name="productId">
          <SelectTrigger id="productId" className="w-full">
            <SelectValue placeholder="Өнімді таңдаңыз (міндетті емес)" />
          </SelectTrigger>
          <SelectContent>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="amount">Сома (₸)</Label>
          <Input id="amount" name="amount" type="number" min={0} step="0.01" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="prepayment">Алдын ала төлем (₸)</Label>
          <Input id="prepayment" name="prepayment" type="number" min={0} step="0.01" defaultValue={0} />
        </div>
      </div>
      {salesUsers && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="assignedToId">Жауапты маман</Label>
          <Select name="assignedToId">
            <SelectTrigger id="assignedToId" className="w-full">
              <SelectValue placeholder="Бөлінбеген (кейін ROP бөледі)" />
            </SelectTrigger>
            <SelectContent>
              {salesUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Сақталуда..." : "Сделка құру"}
      </Button>
    </form>
  );
}
