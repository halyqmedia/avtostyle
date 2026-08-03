"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { updateQuickReply, deleteQuickReply } from "@/actions/quick-replies";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function QuickReplyRow({ reply }: { reply: { id: string; title: string; body: string } }) {
  const [title, setTitle] = useState(reply.title);
  const [body, setBody] = useState(reply.body);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (title.trim() && (title !== reply.title || body !== reply.body)) {
              startTransition(() => updateQuickReply(reply.id, title, body));
            }
          }}
          className="h-8 max-w-xs font-medium"
        />
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={pending}
          onClick={() => startTransition(() => deleteQuickReply(reply.id))}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onBlur={() => {
          if (body.trim() && (title !== reply.title || body !== reply.body)) {
            startTransition(() => updateQuickReply(reply.id, title, body));
          }
        }}
        rows={2}
        className="w-full resize-none rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
    </div>
  );
}
