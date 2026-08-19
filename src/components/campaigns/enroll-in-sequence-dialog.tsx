"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { enrollSelectedContacts } from "@/actions/sequences";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type SequenceOption = { id: string; name: string; stepCount: number };

export function EnrollInSequenceDialog({
  open,
  onOpenChange,
  selectedIds,
  sequences,
  onEnrolled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  sequences: SequenceOption[];
  onEnrolled: () => void;
}) {
  const [sequenceId, setSequenceId] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!sequenceId) {
      toast.error("Тізбекті таңдаңыз");
      return;
    }
    startTransition(async () => {
      try {
        await enrollSelectedContacts(sequenceId, selectedIds);
        onOpenChange(false);
        onEnrolled();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Қосылмады");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Тізбекке қосу — {selectedIds.length} клиент</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Select value={sequenceId} onValueChange={setSequenceId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Тізбекті таңдаңыз" />
            </SelectTrigger>
            <SelectContent>
              {sequences.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} ({s.stepCount} хат)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Бұрыннан осы тізбекте тұрған клиенттер қайта басынан басталмайды — қазіргі күйінде қалады.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending || sequences.length === 0}>
            {pending ? "Қосылуда..." : "Қосу"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
