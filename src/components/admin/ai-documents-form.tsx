"use client";

import { useRef, useTransition } from "react";
import { FileCheck2, FileX2 } from "lucide-react";
import { toast } from "sonner";
import { uploadAiDocument } from "@/actions/ai-settings";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

function DocumentSlot({ slot, label, uploaded }: { slot: string; label: string; uploaded: boolean }) {
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      try {
        await uploadAiDocument(slot, formData);
        toast.success(`${label} жүктелді`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Жүктелмеді");
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        {uploaded ? (
          <FileCheck2 className="size-4 shrink-0 text-primary" />
        ) : (
          <FileX2 className="size-4 shrink-0 text-muted-foreground" />
        )}
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{uploaded ? "Жүктелген" : "Әлі жүктелмеген"}</p>
        </div>
      </div>
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <Button
          size="sm"
          variant="outline"
          type="button"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          {pending ? "Жүктелуде..." : uploaded ? "Ауыстыру" : "Жүктеу"}
        </Button>
      </div>
    </div>
  );
}

export function AiDocumentsForm({
  hasKpKk,
  hasKpRu,
  hasCatalogKk,
  hasCatalogRu,
}: {
  hasKpKk: boolean;
  hasKpRu: boolean;
  hasCatalogKk: boolean;
  hasCatalogRu: boolean;
}) {
  const slots: { slot: string; label: string; uploaded: boolean }[] = [
    { slot: "kp-kk", label: "КП — қазақша", uploaded: hasKpKk },
    { slot: "kp-ru", label: "КП — орысша", uploaded: hasKpRu },
    { slot: "catalog-kk", label: "Каталог — қазақша", uploaded: hasCatalogKk },
    { slot: "catalog-ru", label: "Каталог — орысша", uploaded: hasCatalogRu },
  ];

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs text-muted-foreground">
        Клиент КП немесе каталог сұраса, ИИ агент жауап хатымен бірге осы файлды автоматты жібереді — тілін
        клиенттің сөйлеу тіліне қарай өзі таңдайды.
      </Label>
      {slots.map((s) => (
        <DocumentSlot key={s.slot} {...s} />
      ))}
    </div>
  );
}
