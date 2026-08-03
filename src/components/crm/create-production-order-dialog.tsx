"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, Trash2, Factory } from "lucide-react";
import { toast } from "sonner";
import { createProductionOrder } from "@/actions/production-orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const PAYMENT_TYPES = [
  { value: "cash", label: "Қолма-қол" },
  { value: "card", label: "Карта" },
  { value: "transfer", label: "Аударым" },
];

export function CreateProductionOrderDialog({
  dealId,
  defaultClientName,
  defaultClientPhone,
  defaultPaymentAmount,
  defaultRemainingAmount,
  materials = [],
}: {
  dealId: string | null;
  defaultClientName?: string;
  defaultClientPhone?: string;
  defaultPaymentAmount?: number;
  defaultRemainingAmount?: number;
  materials?: { id: string; name: string; unit: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<number[]>([0]);
  const nextRowKey = useRef(1);
  const [materialByRow, setMaterialByRow] = useState<Record<number, string>>({});

  function addRow() {
    setRows((prev) => [...prev, nextRowKey.current++]);
  }

  function removeRow(key: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r !== key) : prev));
  }

  function handleSubmit(formData: FormData) {
    formData.set("itemCount", String(rows.length));
    startTransition(async () => {
      try {
        await createProductionOrder(dealId, formData);
        toast.success("Заявка өндіріс бөліміне жіберілді");
        setError(undefined);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Заявка құрылмады");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(undefined);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Factory className="size-4" />
          Заявка құру
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Өндіріске жаңа заявка</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="clientName">Клиенттің аты-жөні</Label>
              <Input id="clientName" name="clientName" defaultValue={defaultClientName} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="clientPhone">Телефон нөмірі</Label>
              <Input id="clientPhone" name="clientPhone" defaultValue={defaultClientPhone} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="city">Қаласы</Label>
              <Input id="city" name="city" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address">Адресі</Label>
              <Input id="address" name="address" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="carBrand">Машина маркасы</Label>
              <Input id="carBrand" name="carBrand" placeholder="Toyota Camry" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="carYear">Жылы</Label>
              <Input id="carYear" name="carYear" placeholder="2022" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="carGeneration">Поколение</Label>
              <Input id="carGeneration" name="carGeneration" placeholder="XV70" />
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border p-3">
            <Label>Таңдаған өнім түрі</Label>
            {rows.map((key, i) => {
              const selectedMaterialId = materialByRow[key] ?? "none";
              const selectedMaterial = materials.find((m) => m.id === selectedMaterialId);
              return (
                <div key={key} className="flex flex-col gap-2 rounded-md border border-dashed p-2">
                  <div className="flex items-end gap-2">
                    <div className="flex flex-1 flex-col gap-1.5">
                      <Input name={`item_${i}_productType`} placeholder="Мысалы: EVA ковриктер (алдыңғы+артқы)" required />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Input name={`item_${i}_photo`} type="file" accept="image/*" className="w-48 text-xs" />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={rows.length === 1}
                      onClick={() => removeRow(key)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  {materials.length > 0 && (
                    <div className="flex items-end gap-2">
                      <div className="flex flex-1 flex-col gap-1.5">
                        <Label className="text-xs text-muted-foreground">Складтан шығатын материал (міндетті емес)</Label>
                        <Select
                          value={selectedMaterialId}
                          onValueChange={(v) => setMaterialByRow((prev) => ({ ...prev, [key]: v }))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Материал таңдамау" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Материал таңдамау</SelectItem>
                            {materials.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedMaterial && (
                          <input type="hidden" name={`item_${i}_productId`} value={selectedMaterial.id} />
                        )}
                      </div>
                      {selectedMaterial && (
                        <div className="flex w-32 flex-col gap-1.5">
                          <Label className="text-xs text-muted-foreground">Саны ({selectedMaterial.unit})</Label>
                          <Input name={`item_${i}_quantity`} type="number" min={0} step="0.001" required />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <Button type="button" variant="outline" size="sm" className="self-start" onClick={addRow}>
              <Plus className="size-3.5" />
              Тағы жол қосу
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="paymentAmount">Төлем сомасы (₸)</Label>
              <Input
                id="paymentAmount"
                name="paymentAmount"
                type="number"
                min={0}
                step="0.01"
                defaultValue={defaultPaymentAmount}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="paymentType">Төлем түрі</Label>
              <Select name="paymentType">
                <SelectTrigger id="paymentType" className="w-full">
                  <SelectValue placeholder="Таңдаңыз" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="remainingAmount">Қалған сома (₸)</Label>
              <Input
                id="remainingAmount"
                name="remainingAmount"
                type="number"
                min={0}
                step="0.01"
                defaultValue={defaultRemainingAmount ?? 0}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note">Ескертпе</Label>
            <textarea
              id="note"
              name="note"
              rows={3}
              className="w-full resize-none rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Жіберілуде..." : "Заявка құру"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
