"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { receivePurchaseOrder } from "@/actions/purchase-orders";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function ReceivePurchaseOrderForm({
  orderId,
  items,
  disabled,
}: {
  orderId: string;
  items: { id: string; productName: string; unit: string; quantity: number; receivedQty: number; price: number }[];
  disabled: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await receivePurchaseOrder(orderId, formData);
        toast.success("Қалдық жаңартылды");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Қате шықты");
      }
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Тауар</TableHead>
            <TableHead>Тапсырыс саны</TableHead>
            <TableHead>Бағасы</TableHead>
            <TableHead>Қабылданды</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((it) => (
            <TableRow key={it.id}>
              <TableCell className="font-medium">{it.productName}</TableCell>
              <TableCell className="text-muted-foreground">
                {it.quantity} {it.unit}
              </TableCell>
              <TableCell className="text-muted-foreground">{it.price} ₸</TableCell>
              <TableCell>
                <Input
                  name={`received_${it.id}`}
                  type="number"
                  min={0}
                  max={it.quantity}
                  step="0.001"
                  defaultValue={it.receivedQty}
                  disabled={disabled}
                  className="w-28"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!disabled && (
        <Button type="submit" disabled={pending} className="self-start" variant="secondary">
          {pending ? "Сақталуда..." : "Қалдықты жаңарту"}
        </Button>
      )}
    </form>
  );
}
