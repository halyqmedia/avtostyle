"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { uploadMedia } from "@/lib/media-storage";
import { writeStageHistory } from "@/lib/stage-history";
import { applyStockMovement } from "@/lib/stock";
import { postTransaction } from "@/lib/transactions";

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

function optionalText(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function createProductionOrder(dealId: string | null, formData: FormData): Promise<string> {
  const session = await requirePermission(PERMISSIONS.PRODUCTION_ORDER_CREATE);

  const clientName = optionalText(formData, "clientName");
  const clientPhone = optionalText(formData, "clientPhone");
  if (!clientName) throw new Error("Клиент атын енгізіңіз");
  if (!clientPhone) throw new Error("Телефон нөмірін енгізіңіз");

  const paymentAmount = Number(formData.get("paymentAmount") ?? 0) || 0;
  const remainingAmount = Number(formData.get("remainingAmount") ?? 0) || 0;

  const itemCount = Number(formData.get("itemCount") ?? 0);
  if (!Number.isFinite(itemCount) || itemCount < 1) throw new Error("Кемінде бір өнім қосыңыз");

  const items: {
    productType: string;
    materialPhotoUrl: string | null;
    productId: string | null;
    quantity: number | null;
  }[] = [];
  for (let i = 0; i < itemCount; i++) {
    const productType = optionalText(formData, `item_${i}_productType`);
    if (!productType) throw new Error(`${i + 1}-жол: өнім түрін таңдаңыз`);

    let materialPhotoUrl: string | null = null;
    const photo = formData.get(`item_${i}_photo`);
    if (photo instanceof File && photo.size > 0) {
      if (photo.size > MAX_PHOTO_BYTES) throw new Error(`${i + 1}-жол: фото тым үлкен (8MB-тан аспауы керек)`);
      const buffer = Buffer.from(await photo.arrayBuffer());
      materialPhotoUrl = await uploadMedia(
        `production/materials/${randomUUID()}`,
        buffer,
        photo.type || "application/octet-stream",
      );
    }

    const productId = optionalText(formData, `item_${i}_productId`);
    const quantityRaw = formData.get(`item_${i}_quantity`);
    const quantity = productId && quantityRaw ? Number(quantityRaw) : null;
    if (productId && !(quantity && quantity > 0)) throw new Error(`${i + 1}-жол: материал санын енгізіңіз`);

    items.push({ productType, materialPhotoUrl, productId, quantity });
  }

  const defaultStage = await prisma.pipelineStage.findFirst({
    where: { pipeline: "PRODUCTION", isDefault: true },
  });
  if (!defaultStage) throw new Error("Өндіріс pipeline-ы бапталмаған");

  const defaultWarehouse = await prisma.warehouse.findFirst({ where: { isDefault: true } });

  const orderId = await prisma.$transaction(
    async (tx) => {
      const order = await tx.productionOrder.create({
        data: {
          dealId,
          clientName,
          clientPhone,
          city: optionalText(formData, "city"),
          address: optionalText(formData, "address"),
          carBrand: optionalText(formData, "carBrand"),
          carYear: optionalText(formData, "carYear"),
          carGeneration: optionalText(formData, "carGeneration"),
          paymentAmount,
          paymentType: optionalText(formData, "paymentType"),
          remainingAmount,
          note: optionalText(formData, "note"),
          pipelineStageId: defaultStage.id,
          createdById: session.user.id,
          items: {
            create: items.map((it) => ({
              productType: it.productType,
              materialPhotoUrl: it.materialPhotoUrl,
              productId: it.productId,
              quantity: it.quantity,
            })),
          },
        },
      });

      // Orders opened straight from Production (no linked Deal) have no other income
      // record — their payment is the only trace of the sale, so post it here.
      // Deal-linked orders skip this: that revenue is already posted via the deal's
      // own prepayment (see actions/deals.ts) and would otherwise be double-counted.
      if (!dealId && paymentAmount > 0) {
        await postTransaction(tx, {
          type: "INCOME",
          category: "sales_payment",
          amount: paymentAmount,
          productionOrderId: order.id,
          description: "Өндіріс заявкасы бойынша төлем",
          createdById: session.user.id,
        });
      }

      if (defaultWarehouse) {
        for (const it of items) {
          if (!it.productId || !it.quantity) continue;
          await applyStockMovement(tx, {
            productId: it.productId,
            warehouseId: defaultWarehouse.id,
            type: "OUT",
            quantity: -it.quantity,
            reason: "production_order",
            refId: order.id,
            createdById: session.user.id,
          });
        }
      }

      return order.id;
    },
    { timeout: 15000, maxWait: 10000 },
  );

  revalidatePath("/production");
  revalidatePath("/warehouse");
  if (dealId) revalidatePath(`/crm/deals/${dealId}`);
  return orderId;
}

export async function moveProductionOrderStage(orderId: string, toStageId: string, formData?: FormData) {
  const session = await requirePermission(PERMISSIONS.PRODUCTION_ACCESS);

  const order = await prisma.productionOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Заявка табылмады");
  if (order.pipelineStageId === toStageId) return;

  let photoUrl: string | undefined;
  const photo = formData?.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > MAX_PHOTO_BYTES) throw new Error("Фото тым үлкен (8MB-тан аспауы керек)");
    const buffer = Buffer.from(await photo.arrayBuffer());
    photoUrl = await uploadMedia(`production/stage-photos/${randomUUID()}`, buffer, photo.type || "application/octet-stream");
  }

  await prisma.$transaction(async (tx) => {
    await tx.productionOrder.update({ where: { id: orderId }, data: { pipelineStageId: toStageId } });
    await writeStageHistory(tx, {
      entityType: "PRODUCTION_ORDER",
      entityId: orderId,
      fromStageId: order.pipelineStageId,
      toStageId,
      movedById: session.user.id,
      photoUrl,
    });
  });

  revalidatePath("/production");
  revalidatePath(`/production/orders/${orderId}`);
}
