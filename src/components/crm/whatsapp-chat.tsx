"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { format } from "date-fns";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { sendDealWhatsAppMessage } from "@/actions/whatsapp";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type WhatsAppMessageItem = {
  id: string;
  direction: "IN" | "OUT";
  body: string;
  createdAt: string;
  sentByName: string | null;
  status?: string | null;
  errorMessage?: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  SENT: "жіберілді",
  DELIVERED: "жеткізілді",
  READ: "оқылды",
  FAILED: "жеткізілмеді",
};

export function WhatsAppChat({
  dealId,
  clientName,
  phone,
  messages,
  canSend,
}: {
  dealId: string;
  clientName: string;
  phone: string | null;
  messages: WhatsAppMessageItem[];
  canSend: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const link = buildWhatsAppLink(phone);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function send() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    startTransition(async () => {
      try {
        await sendDealWhatsAppMessage(dealId, trimmed);
        setDraft("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Хабарлама жіберілмеді");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">Әзірге хабарлама жоқ.</p>
      ) : (
        <div ref={listRef} className="flex h-80 flex-col gap-2 overflow-y-auto rounded-lg bg-muted/10 p-2">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn("flex flex-col gap-0.5 max-w-[80%]", m.direction === "OUT" && "ml-auto items-end")}
            >
              <div
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-sm",
                  m.direction === "OUT"
                    ? "bg-[#25D366]/15 text-foreground"
                    : "border bg-background",
                )}
              >
                <p className="whitespace-pre-wrap">{m.body}</p>
              </div>
              <p className="px-1 text-[11px] text-muted-foreground">
                {m.direction === "OUT" ? (m.sentByName ?? "Маман") : clientName} ·{" "}
                {format(new Date(m.createdAt), "dd.MM.yyyy HH:mm")}
                {m.direction === "OUT" && m.status && STATUS_LABEL[m.status] && (
                  <>
                    {" · "}
                    <span className={m.status === "FAILED" ? "text-destructive" : undefined}>
                      {STATUS_LABEL[m.status]}
                    </span>
                  </>
                )}
              </p>
              {m.direction === "OUT" && m.status === "FAILED" && m.errorMessage && (
                <p className="px-1 text-[11px] text-destructive">{m.errorMessage}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {canSend ? (
        <div className="flex flex-col gap-1.5 border-t pt-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="WhatsApp хабарламасын жазыңыз..."
            rows={2}
            className="w-full resize-none rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" disabled={pending || !draft.trim()} onClick={send}>
              {pending ? "Жіберілуде..." : "Жіберу"}
            </Button>
            {link && (
              <Button asChild size="sm" variant="ghost">
                <a href={link} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="size-4" />
                  WhatsApp-та ашу
                </a>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Клиенттің телефон нөмірі көрсетілмеген — хабарлама жіберу қолжетімсіз.
        </p>
      )}
    </div>
  );
}
