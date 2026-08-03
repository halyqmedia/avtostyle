"use client";

import { useActionState } from "react";
import { createWarehouse } from "@/actions/warehouses";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function CreateWarehouseForm() {
  const [state, formAction, pending] = useActionState(createWarehouse, undefined);

  return (
    <form action={formAction} className="flex items-end gap-3 rounded-lg border border-dashed p-3">
      <div className="flex flex-1 flex-col gap-1.5 sm:max-w-xs">
        <Label htmlFor="w-name">Склад атауы</Label>
        <Input id="w-name" name="name" placeholder="Мысалы: Филиал №2" required />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} variant="secondary">
        {pending ? "Қосылуда..." : "+ Склад қосу"}
      </Button>
    </form>
  );
}
