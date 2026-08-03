"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { applyStockMovement } from "@/lib/stock";
import { postTransaction } from "@/lib/transactions";

function optionalText(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function createPurchaseOrder(formData: FormData): Promise<string> {
  const session = await requirePermission(PERMISSIONS.WAREHOUSE_MANAGE);

  const supplierId = optionalText(formData, "supplierId");
  const warehouseId = optionalText(formData, "warehouseId");
  if (!supplierId) throw new Error("Жабдықтаушыны таңдаңыз");
  if (!warehouseId) throw new Error("Складты таңдаңыз");

  const itemCount = Number(formData.get("itemCount") ?? 0);
  if (!Number.isFinite(itemCount) || itemCount < 1) throw new Error("Кемінде бір тауар қосыңыз");

  const items: { productId: string; quantity: number; price: number }[] = [];
  for (let i = 0; i < itemCount; i++) {
    const productId = optionalText(formData, `item_${i}_productId`);
    if (!productId) continue;
    const quantity = Number(formData.get(`item_${i}_quantity`) ?? 0);
    const price = Number(formData.get(`item_${i}_price`) ?? 0);
    if (!(quantity > 0)) throw new Error(`${i + 1}-жол: саны дұрыс емес`);
    items.push({ productId, quantity, price: Number.isFinite(price) ? price : 0 });
  }
  if (items.length === 0) throw new Error("Кемінде бір тауар қосыңыз");

  const order = await prisma.purchaseOrder.create({
    data: {
      supplierId,
      warehouseId,
      comment: optionalText(formData, "comment"),
      createdById: session.user.id,
      items: { create: items },
    },
  });

  revalidatePath("/warehouse/purchase-orders");
  return order.id;
}

export async function receivePurchaseOrder(orderId: string, formData: FormData) {
  const session = await requirePermission(PERMISSIONS.WAREHOUSE_MANAGE);

  const order = await prisma.purchaseOrder.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) throw new Error("Заказ табылмады");
  if (order.status === "RECEIVED" || order.status === "CANCELLED") return;

  const updates: { itemId: string; productId: string; delta: number; newReceivedQty: number; price: number }[] = [];
  for (const item of order.items) {
    const raw = formData.get(`received_${item.id}`);
    if (raw === null) continue;
    const newReceivedQty = Number(raw);
    if (!Number.isFinite(newReceivedQty) || newReceivedQty < 0) continue;
    const currentQty = Number(item.quantity);
    const cappedQty = Math.min(newReceivedQty, currentQty);
    const delta = cappedQty - Number(item.receivedQty);
    if (delta === 0) continue;
    updates.push({ itemId: item.id, productId: item.productId, delta, newReceivedQty: cappedQty, price: Number(item.price) });
  }
  if (updates.length === 0) return;

  await prisma.$transaction(
    async (tx) => {
      for (const u of updates) {
        await tx.purchaseOrderItem.update({
          where: { id: u.itemId },
          data: { receivedQty: u.newReceivedQty },
        });
        await applyStockMovement(tx, {
          productId: u.productId,
          warehouseId: order.warehouseId,
          type: "IN",
          quantity: u.delta,
          reason: "purchase_order",
          refId: order.id,
          createdById: session.user.id,
        });
        if (u.delta > 0) {
          await postTransaction(tx, {
            type: "EXPENSE",
            category: "material_purchase",
            amount: u.delta * u.price,
            purchaseOrderId: order.id,
            description: `Заказ №${order.number} қабылдау`,
            createdById: session.user.id,
          });
        }
      }

      const freshItems = await tx.purchaseOrderItem.findMany({ where: { orderId: order.id } });
      const allReceived = freshItems.every((i) => Number(i.receivedQty) >= Number(i.quantity));
      const anyReceived = freshItems.some((i) => Number(i.receivedQty) > 0);
      await tx.purchaseOrder.update({
        where: { id: order.id },
        data: { status: allReceived ? "RECEIVED" : anyReceived ? "PARTIALLY_RECEIVED" : order.status },
      });
    },
    { timeout: 15000, maxWait: 10000 },
  );

  revalidatePath("/warehouse/purchase-orders");
  revalidatePath(`/warehouse/purchase-orders/${orderId}`);
  revalidatePath("/warehouse");
}

export async function togglePurchaseOrderPaid(orderId: string, isPaid: boolean) {
  await requirePermission(PERMISSIONS.WAREHOUSE_MANAGE);
  await prisma.purchaseOrder.update({ where: { id: orderId }, data: { isPaid } });
  revalidatePath(`/warehouse/purchase-orders/${orderId}`);
  revalidatePath("/warehouse/purchase-orders");
}

export async function cancelPurchaseOrder(orderId: string) {
  await requirePermission(PERMISSIONS.WAREHOUSE_MANAGE);
  const order = await prisma.purchaseOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Заказ табылмады");
  if (order.status === "RECEIVED") throw new Error("Толық қабылданған заказды болдырмауға болмайды");

  await prisma.purchaseOrder.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
  revalidatePath(`/warehouse/purchase-orders/${orderId}`);
  revalidatePath("/warehouse/purchase-orders");
}
