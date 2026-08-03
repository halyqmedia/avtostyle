"use client";

import { useActionState } from "react";
import { createProduct } from "@/actions/products";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CreateProductForm() {
  const [state, formAction, pending] = useActionState(createProduct, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-dashed p-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-name">Атауы</Label>
          <Input id="p-name" name="name" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-sku">SKU / код</Label>
          <Input id="p-sku" name="sku" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-category">Түрі</Label>
          <Select name="category" defaultValue="finished">
            <SelectTrigger id="p-category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="material">Шикізат</SelectItem>
              <SelectItem value="finished">Дайын өнім</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-unit">Өлшем бірлігі</Label>
          <Input id="p-unit" name="unit" defaultValue="шт" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-price">Сату бағасы (₸)</Label>
          <Input id="p-price" name="price" type="number" min={0} step="0.01" defaultValue={0} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-cost">Өзіндік құн (₸)</Label>
          <Input id="p-cost" name="cost" type="number" min={0} step="0.01" defaultValue={0} />
        </div>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="self-start" variant="secondary">
        {pending ? "Қосылуда..." : "+ Тауар қосу"}
      </Button>
    </form>
  );
}
