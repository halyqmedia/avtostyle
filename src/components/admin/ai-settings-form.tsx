"use client";

import { useActionState, useState } from "react";
import { updateAiSettings } from "@/actions/ai-settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MODELS = [
  { value: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite — ең арзан, тез (ұсынылады)" },
  { value: "gemini-3.6-flash", label: "Gemini 3.6 Flash — күштірек, қымбатырақ" },
];

export function AiSettingsForm({
  settings,
}: {
  settings: {
    enabled: boolean;
    systemPrompt: string;
    model: string;
    maxHistoryMessages: number;
    maxOutputTokens: number;
  };
}) {
  const [state, formAction, pending] = useActionState(updateAiSettings, undefined);
  const [enabled, setEnabled] = useState(settings.enabled);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="enabled"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="size-4"
        />
        ИИ агент іске қосылған (жаңа лидтерге автоматты жауап береді)
      </label>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="systemPrompt">Нұсқаулық (сату сценарийі, тон, ережелер)</Label>
        <textarea
          id="systemPrompt"
          name="systemPrompt"
          defaultValue={settings.systemPrompt}
          rows={12}
          className="w-full resize-y rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <p className="text-xs text-muted-foreground">
          Тауар каталогы (атауы мен бағасы) әр хабарламаға автоматты қосылады — оны бұл жерге қайта
          жазудың қажеті жоқ.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="model">Модель</Label>
          <Select name="model" defaultValue={settings.model}>
            <SelectTrigger id="model" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODELS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="maxHistoryMessages">Есте сақтайтын хабарлама саны</Label>
          <Input
            id="maxHistoryMessages"
            name="maxHistoryMessages"
            type="number"
            min={2}
            max={40}
            defaultValue={settings.maxHistoryMessages}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="maxOutputTokens">Жауаптың макс. ұзындығы (токен)</Label>
          <Input
            id="maxOutputTokens"
            name="maxOutputTokens"
            type="number"
            min={50}
            max={2000}
            defaultValue={settings.maxOutputTokens}
          />
        </div>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Сақталуда..." : "Баптауларды сақтау"}
      </Button>
    </form>
  );
}
