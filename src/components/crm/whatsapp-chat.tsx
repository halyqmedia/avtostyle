"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, isSameDay, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import { sendDealWhatsAppMessage, sendDealWhatsAppFile } from "@/actions/whatsapp";
import { MessageBubble } from "@/components/crm/message-bubble";
import { MessageComposer } from "@/components/crm/message-composer";

export type QuickReplyItem = { id: string; title: string; body: string };

export type WhatsAppMessageItem = {
  id: string;
  direction: "IN" | "OUT";
  body: string;
  createdAt: string;
  sentByName: string | null;
  status?: string | null;
  errorMessage?: string | null;
  messageType?: string;
  mediaSrc?: string | null;
  mediaMimeType?: string | null;
  fileName?: string | null;
  aiGenerated?: boolean;
};

function dateLabel(date: Date): string {
  if (isToday(date)) return "Бүгін";
  if (isYesterday(date)) return "Кеше";
  return format(date, "dd MMMM");
}

export function WhatsAppChat({
  dealId,
  clientName,
  phone,
  messages,
  canSend,
  quickReplies = [],
}: {
  dealId: string;
  clientName: string;
  phone: string | null;
  messages: WhatsAppMessageItem[];
  canSend: boolean;
  quickReplies?: QuickReplyItem[];
}) {
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);
  const router = useRouter();

  useEffect(() => {
    // Only auto-scroll when a message was actually added — otherwise the 5s poll below would
    // yank the view back to the bottom every time it refetches, even while someone's scrolled
    // up reading older history.
    const el = listRef.current;
    if (el && messages.length > prevCountRef.current) el.scrollTop = el.scrollHeight;
    prevCountRef.current = messages.length;
  }, [messages]);

  // Client can reply any time; without this, a new inbound message just sits in the DB until
  // someone manually reloads the page. Skips while the tab is hidden to avoid needless refetches.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 5000);
    return () => clearInterval(id);
  }, [router]);

  function sendText(text: string) {
    startTransition(async () => {
      try {
        await sendDealWhatsAppMessage(dealId, text);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Хабарлама жіберілмеді");
      }
    });
  }

  function sendFile(file: File, isVoiceNote = false) {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        if (isVoiceNote) formData.append("isVoiceNote", "1");
        await sendDealWhatsAppFile(dealId, formData);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Файл жіберілмеді");
      }
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {messages.length === 0 ? (
        <p className="flex-1 p-4 text-sm text-muted-foreground">Әзірге хабарлама жоқ.</p>
      ) : (
        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3">
          <div className="flex flex-col gap-3">
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const showSeparator = !prev || !isSameDay(new Date(prev.createdAt), new Date(m.createdAt));
              return (
                <div key={m.id} className="flex flex-col gap-3">
                  {showSeparator && (
                    <div className="my-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <div className="h-px flex-1 bg-border" />
                      {dateLabel(new Date(m.createdAt))}
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  <MessageBubble message={m} clientName={clientName} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {canSend ? (
        <MessageComposer phone={phone} pending={pending} quickReplies={quickReplies} onSendText={sendText} onSendFile={sendFile} />
      ) : (
        <p className="border-t p-3 text-xs text-muted-foreground">
          Клиенттің телефон нөмірі көрсетілмеген — хабарлама жіберу қолжетімсіз.
        </p>
      )}
    </div>
  );
}
