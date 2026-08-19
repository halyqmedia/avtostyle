"use client";

import { format } from "date-fns";
import { Paperclip, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WhatsAppMessageItem } from "@/components/crm/whatsapp-chat";

const STATUS_LABEL: Record<string, string> = {
  SENT: "жіберілді",
  DELIVERED: "жеткізілді",
  READ: "оқылды",
  FAILED: "жеткізілмеді",
};

export function MessageBubble({ message, clientName }: { message: WhatsAppMessageItem; clientName: string }) {
  const isOut = message.direction === "OUT";
  const isAi = isOut && message.aiGenerated;

  return (
    <div className={cn("flex max-w-[78%] flex-col gap-1", isOut && "ml-auto items-end")}>
      <div
        className={cn(
          "rounded-2xl px-3 py-2 text-sm shadow-sm",
          isAi
            ? "border border-primary/20 bg-primary/[0.06] text-foreground"
            : isOut
              ? "bg-[#DCF8C6] text-foreground dark:bg-emerald-900/40"
              : "border bg-background text-foreground",
        )}
      >
        {isAi && (
          <p className="mb-1 flex items-center gap-1 text-[11px] font-medium text-primary">
            <Sparkles className="size-3" />
            AI агент
          </p>
        )}
        {message.messageType === "image" && message.mediaSrc ? (
          <a href={message.mediaSrc} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived presigned S3 URL, next/image optimization adds no value here */}
            <img
              src={message.mediaSrc}
              alt={message.fileName ?? "сурет"}
              className="max-h-64 max-w-full rounded-lg object-contain"
            />
          </a>
        ) : message.messageType === "audio" && message.mediaSrc ? (
          <audio controls src={message.mediaSrc} className="h-9 max-w-[240px]" />
        ) : message.messageType && message.messageType !== "text" && message.mediaSrc ? (
          <a
            href={message.mediaSrc}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 underline underline-offset-2"
          >
            <Paperclip className="size-3.5 shrink-0" />
            {message.fileName ?? "Файл"}
          </a>
        ) : null}
        {message.body && <p className="whitespace-pre-wrap leading-snug">{message.body}</p>}
      </div>
      <p className="px-1 text-[11px] text-muted-foreground">
        {isOut ? (isAi ? "AI агент" : (message.sentByName ?? "Маман")) : clientName} ·{" "}
        {format(new Date(message.createdAt), "HH:mm")}
        {isOut && message.status && STATUS_LABEL[message.status] && (
          <>
            {" · "}
            <span className={message.status === "FAILED" ? "text-destructive" : undefined}>
              {STATUS_LABEL[message.status]}
            </span>
          </>
        )}
      </p>
      {isOut && message.status === "FAILED" && message.errorMessage && (
        <p className="px-1 text-[11px] text-destructive">{message.errorMessage}</p>
      )}
    </div>
  );
}
