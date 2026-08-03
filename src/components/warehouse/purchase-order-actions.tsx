"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { togglePurchaseOrderPaid, cancelPurchaseOrder } from "@/actions/purchase-orders";
import { Button } from "@/components/ui/button";

export function PurchaseOrderActions({
  orderId,
  isPaid,
  canCancel,
}: {
  orderId: string;
  isPaid: boolean;
  canCancel: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <Button
        variant={isPaid ? "secondary" : "default"}
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              await togglePurchaseOrderPaid(orderId, !isPaid);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Қате шықты");
            }
          })
        }
      >
        {isPaid ? "Төленбеген деп белгілеу" : "Төленген деп белгілеу"}
      </Button>
      {canCancel && (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              try {
                await cancelPurchaseOrder(orderId);
                toast.success("Заказ болдырылмады");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Қате шықты");
              }
            })
          }
        >
          Болдырмау
        </Button>
      )}
    </div>
  );
}
