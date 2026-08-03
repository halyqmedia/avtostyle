"use client";

import { useActionState } from "react";
import { createStockAdjustment } from "@/actions/stock-adjustments";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function StockAdjustmentForm({
  productId,
  warehouses,
}: {
  productId: string;
  warehouses: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createStockAdjustment, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-dashed p-3">
      <input type="hidden" name="productId" value={productId} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="adj-warehouse">Склад</Label>
          <Select name="warehouseId" required>
            <SelectTrigger id="adj-warehouse" className="w-full">
              <SelectValue placeholder="Таңдаңыз" />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="adj-delta">Түзету (+/-)</Label>
          <Input id="adj-delta" name="delta" type="number" step="0.001" placeholder="-5 немесе 10" required />
        </div>
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label htmlFor="adj-note">Себебі</Label>
          <Input id="adj-note" name="note" placeholder="Мысалы: түгендеу нәтижесі, брак" />
        </div>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="self-start" variant="secondary">
        {pending ? "Сақталуда..." : "Түзету қосу"}
      </Button>
    </form>
  );
}
