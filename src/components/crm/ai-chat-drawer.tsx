"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { askAiAboutDeal } from "@/actions/ai-chat";
import type { ChatTurn } from "@/lib/gemini";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function AIChatDrawer({
  dealId,
  open,
  onOpenChange,
}: {
  dealId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  function ask() {
    const question = draft.trim();
    if (!question) return;
    setDraft("");
    setTurns((prev) => [...prev, { role: "user", text: question }]);
    startTransition(async () => {
      try {
        const answer = await askAiAboutDeal(dealId, question, turns);
        setTurns((prev) => [...prev, { role: "model", text: answer }]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "ИИ жауап бере алмады");
        setTurns((prev) => prev.slice(0, -1));
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0 sm:max-w-sm">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-1.5">
            <Sparkles className="size-4 text-primary" />
            AI көмекші
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {turns.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Бұл сделка туралы кез келген сұрақ қойыңыз — ИИ хат-хабар мен талдау негізінде жауап береді. Бұл
              жерде жазылған ештеңе клиентке жіберілмейді.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {turns.map((t, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    t.role === "user" ? "ml-auto bg-primary/10 text-foreground" : "border bg-background",
                  )}
                >
                  <p className="whitespace-pre-wrap leading-snug">{t.text}</p>
                </div>
              ))}
              {pending && <p className="text-xs text-muted-foreground">ИИ жауап дайындап жатыр...</p>}
            </div>
          )}
        </div>

        <div className="flex items-end gap-2 border-t p-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask();
              }
            }}
            placeholder="Сұрақ жазыңыз..."
            rows={1}
            className="max-h-32 min-h-9 w-full flex-1 resize-none rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <Button size="sm" disabled={pending || !draft.trim()} onClick={ask}>
            ↑
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
