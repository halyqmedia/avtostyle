"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { addDealNote, updateDealNote } from "@/actions/deal-notes";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type DealNoteItem = {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function NoteRow({
  note,
  canEdit,
}: {
  note: DealNoteItem;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.body);
  const [pending, startTransition] = useTransition();
  const wasEdited = note.updatedAt !== note.createdAt;

  function save() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    startTransition(async () => {
      try {
        await updateDealNote(note.id, trimmed);
        setEditing(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Сақтау сәтсіз аяқталды");
      }
    });
  }

  return (
    <div className="flex gap-2.5" data-testid="note-row" data-note-id={note.id}>
      <Avatar className="size-7 shrink-0">
        <AvatarFallback className="text-[11px]">{initials(note.authorName)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 rounded-lg border bg-muted/20 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium">{note.authorName}</p>
          <div className="flex items-center gap-2">
            <p className="text-[11px] text-muted-foreground">
              {format(new Date(note.createdAt), "dd.MM.yyyy HH:mm")}
              {wasEdited && " · өңделген"}
            </p>
            {canEdit && !editing && (
              <button
                type="button"
                onClick={() => {
                  setDraft(note.body);
                  setEditing(true);
                }}
                className="text-[11px] text-muted-foreground underline hover:text-foreground"
              >
                Өңдеу
              </button>
            )}
          </div>
        </div>
        {editing ? (
          <div className="mt-1.5 flex flex-col gap-1.5">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              className={cn(
                "w-full resize-none rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              )}
            />
            <div className="flex gap-1.5">
              <Button size="sm" disabled={pending} onClick={save}>
                Сақтау
              </Button>
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => setEditing(false)}>
                Бас тарту
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 whitespace-pre-wrap text-sm">{note.body}</p>
        )}
      </div>
    </div>
  );
}

export function DealNotes({
  dealId,
  notes,
  currentUserId,
  canEditAll,
}: {
  dealId: string;
  notes: DealNoteItem[];
  currentUserId: string;
  canEditAll: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    startTransition(async () => {
      try {
        await addDealNote(dealId, trimmed);
        setDraft("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Сақтау сәтсіз аяқталды");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Әзірге ескертпе жоқ.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {notes.map((n) => (
            <NoteRow key={n.id} note={n} canEdit={canEditAll || n.authorId === currentUserId} />
          ))}
        </div>
      )}
      <div className="flex flex-col gap-1.5 border-t pt-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Қосымша ақпарат қосыңыз (қоңырау нәтижесі, келісілген шарт, т.б.)..."
          rows={2}
          className="w-full resize-none rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <Button size="sm" disabled={pending || !draft.trim()} onClick={submit} className="self-start">
          {pending ? "Қосылуда..." : "Ескертпе қосу"}
        </Button>
      </div>
    </div>
  );
}
