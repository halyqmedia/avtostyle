"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { MessageCircle, Mic, Paperclip, Send, Square, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import type { QuickReplyItem } from "@/components/crm/whatsapp-chat";

export function MessageComposer({
  phone,
  pending,
  quickReplies = [],
  onSendText,
  onSendFile,
}: {
  phone: string | null;
  pending: boolean;
  quickReplies?: QuickReplyItem[];
  onSendText: (text: string) => void;
  onSendFile: (file: File, isVoiceNote?: boolean) => void;
}) {
  const [draft, setDraft] = useState("");
  const [recording, setRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const link = buildWhatsAppLink(phone);

  function send() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSendText(trimmed);
    setDraft("");
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
        onSendFile(new File([blob], "dauys-hab.webm", { type: blob.type }), true);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      toast.error("Микрофонға рұқсат берілмеді");
    }
  }

  return (
    <div className="sticky bottom-0 flex flex-col gap-2 border-t bg-background/95 p-3 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="flex items-end gap-2 rounded-2xl border bg-muted/30 p-2">
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
          rows={1}
          className="max-h-32 min-h-9 w-full flex-1 resize-none bg-transparent px-1.5 py-1 text-sm outline-none"
        />
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onSendFile(file);
            e.target.value = "";
          }}
        />
        <Button
          size="icon-sm"
          variant="ghost"
          type="button"
          disabled={pending || recording}
          onClick={() => fileInputRef.current?.click()}
          title="Файл тіркеу"
        >
          <Paperclip className="size-4" />
        </Button>
        <Button
          size="icon-sm"
          variant={recording ? "destructive" : "ghost"}
          type="button"
          disabled={pending && !recording}
          onClick={toggleRecording}
          title={recording ? "Тоқтату" : "Дауыстық хабар"}
        >
          {recording ? <Square className="size-4" /> : <Mic className="size-4" />}
        </Button>
        <Button size="icon-sm" disabled={pending || !draft.trim()} onClick={send} title="Жіберу">
          <Send className="size-4" />
        </Button>
      </div>
      <div className="flex items-center gap-1 px-1">
        {quickReplies.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground">
                <Zap className="size-3.5" />
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
          <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground">
            <a href={link} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="size-3.5" />
              WhatsApp-та ашу
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
