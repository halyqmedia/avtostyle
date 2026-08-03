"use client";

import { useTransition } from "react";
import { Bot } from "lucide-react";
import { toast } from "sonner";
import { toggleDealAi } from "@/actions/ai-settings";
import { Button } from "@/components/ui/button";

export function DealAiToggle({ dealId, aiEnabled }: { dealId: string; aiEnabled: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant={aiEnabled ? "secondary" : "outline"}
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await toggleDealAi(dealId, !aiEnabled);
            toast.success(aiEnabled ? "ИИ агент өшірілді — сіз өзіңіз жауап бересіз" : "ИИ агент қосылды");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Қате шықты");
          }
        })
      }
    >
      <Bot className="size-4" />
      {aiEnabled ? "ИИ агент қосулы" : "ИИ агент өшірулі"}
    </Button>
  );
}
