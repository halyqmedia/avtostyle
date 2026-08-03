"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { format } from "date-fns";
import { MessageCircle, Zap, Paperclip, Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { sendDealWhatsAppMessage, sendDealWhatsAppFile } from "@/actions/whatsapp";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

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
  quickReplies = [],
}: {
  dealId: string;
  clientName: string;
  phone: string | null;
  messages: WhatsAppMessageItem[];
  canSend: boolean;
  quickReplies?: QuickReplyItem[];
}) {
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [recording, setRecording] = useState(false);
  const link = buildWhatsAppLink(phone);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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

  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        sendFile(new File([blob], "dauys-hab.webm", { type: blob.type }), true);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      toast.error("Микрофонға рұқсат берілмеді");
    }
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
                {m.messageType === "image" && m.mediaSrc ? (
                  <a href={m.mediaSrc} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element -- short-lived presigned S3 URL, next/image optimization adds no value here */}
                    <img
                      src={m.mediaSrc}
                      alt={m.fileName ?? "сурет"}
                      className="max-h-64 max-w-full rounded-md object-contain"
                    />
                  </a>
                ) : m.messageType === "audio" && m.mediaSrc ? (
                  <audio controls src={m.mediaSrc} className="h-9 max-w-[240px]" />
                ) : m.messageType && m.messageType !== "text" && m.mediaSrc ? (
                  <a
                    href={m.mediaSrc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 underline underline-offset-2"
                  >
                    <Paperclip className="size-3.5 shrink-0" />
                    {m.fileName ?? "Файл"}
                  </a>
                ) : null}
                {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
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
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={pending || !draft.trim()} onClick={send}>
              {pending ? "Жіберілуде..." : "Жіберу"}
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) sendFile(file);
                e.target.value = "";
              }}
            />
            <Button
              size="sm"
              variant="ghost"
              type="button"
              disabled={pending || recording}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="size-4" />
              Файл
            </Button>

            <Button
              size="sm"
              variant={recording ? "destructive" : "ghost"}
              type="button"
              disabled={pending && !recording}
              onClick={toggleRecording}
            >
              {recording ? <Square className="size-4" /> : <Mic className="size-4" />}
              {recording ? "Тоқтату" : "Дауыс"}
            </Button>

            {quickReplies.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <Zap className="size-4" />
                    Жылдам жауап
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {quickReplies.map((qr) => (
                    <DropdownMenuItem
                      key={qr.id}
                      onSelect={() => setDraft((prev) => (prev.trim() ? `${prev}\n${qr.body}` : qr.body))}
                    >
                      {qr.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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
