"use client";

import { useActionState } from "react";
import { createQuickReply } from "@/actions/quick-replies";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function CreateQuickReplyForm() {
  const [state, formAction, pending] = useActionState(createQuickReply, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-dashed p-3">
      <div className="flex flex-col gap-1.5 sm:max-w-xs">
        <Input name="title" placeholder="Атауы (мыс. Сәлемдесу)" required />
      </div>
      <textarea
        name="body"
        placeholder="Хабарлама мәтіні"
        rows={3}
        required
        className="w-full resize-none rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="self-start" variant="secondary">
        {pending ? "Қосылуда..." : "+ Жылдам жауап қосу"}
      </Button>
    </form>
  );
}
