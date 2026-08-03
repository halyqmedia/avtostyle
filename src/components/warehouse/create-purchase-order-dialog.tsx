"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { createPurchaseOrder } from "@/actions/purchase-orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function CreatePurchaseOrderDialog({
  suppliers,
  warehouses,
  products,
}: {
  suppliers: { id: string; name: string }[];
  warehouses: { id: string; name: string; isDefault: boolean }[];
  products: { id: string; name: string; unit: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<number[]>([0]);
  const nextRowKey = useRef(1);

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
        const orderId = await createPurchaseOrder(formData);
        toast.success("Заказ құрылды");
        setError(undefined);
        setOpen(false);
        router.push(`/warehouse/purchase-orders/${orderId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Заказ құрылмады");
      }
    });
  }

  const defaultWarehouseId = warehouses.find((w) => w.isDefault)?.id;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(undefined);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <ShoppingCart className="size-4" />
          Жаңа заказ
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Жабдықтаушыға жаңа заказ</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="po-supplier">Жабдықтаушы</Label>
              <Select name="supplierId" required>
                <SelectTrigger id="po-supplier" className="w-full">
                  <SelectValue placeholder="Таңдаңыз" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="po-warehouse">Склад</Label>
              <Select name="warehouseId" defaultValue={defaultWarehouseId} required>
                <SelectTrigger id="po-warehouse" className="w-full">
                  <SelectValue placeholder="Таңдаңыз" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border p-3">
            <Label>Тауарлар</Label>
            {rows.map((key, i) => (
              <div key={key} className="flex items-end gap-2">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Select name={`item_${i}_productId`} required>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Тауар таңдаңыз" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex w-28 flex-col gap-1.5">
                  <Input name={`item_${i}_quantity`} type="number" min={0} step="0.001" placeholder="Саны" required />
                </div>
                <div className="flex w-32 flex-col gap-1.5">
                  <Input name={`item_${i}_price`} type="number" min={0} step="0.01" placeholder="Бағасы ₸" required />
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
            ))}
            <Button type="button" variant="outline" size="sm" className="self-start" onClick={addRow}>
              <Plus className="size-3.5" />
              Тағы жол қосу
            </Button>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="po-comment">Ескертпе</Label>
            <textarea
              id="po-comment"
              name="comment"
              rows={2}
              className="w-full resize-none rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Құрылуда..." : "Заказ құру"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
