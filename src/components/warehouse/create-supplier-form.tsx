"use client";

import { useActionState } from "react";
import { createSupplier } from "@/actions/suppliers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function CreateSupplierForm() {
  const [state, formAction, pending] = useActionState(createSupplier, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-dashed p-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="s-name">Атауы</Label>
          <Input id="s-name" name="name" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="s-contact">Байланыс тұлғасы</Label>
          <Input id="s-contact" name="contactPerson" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="s-phone">Телефон</Label>
          <Input id="s-phone" name="phone" />
        </div>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="self-start" variant="secondary">
        {pending ? "Қосылуда..." : "+ Жабдықтаушы қосу"}
      </Button>
    </form>
  );
}
