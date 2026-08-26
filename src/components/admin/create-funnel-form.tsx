"use client";

import { useActionState } from "react";
import { createFunnel } from "@/actions/ai-settings";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function CreateFunnelForm() {
  const [state, formAction, pending] = useActionState(createFunnel, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-dashed p-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1.5 sm:max-w-xs">
        <Input name="name" placeholder="Жаңа воронка атауы (мыс. ТПЕ 2 өнім)" required />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} variant="secondary">
        {pending ? "Құрылуда..." : "+ Жаңа воронка"}
      </Button>
    </form>
  );
}
