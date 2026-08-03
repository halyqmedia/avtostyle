"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { uploadMedia } from "@/lib/media-storage";
import { writeStageHistory } from "@/lib/stage-history";

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

  const items: { productType: string; materialPhotoUrl: string | null }[] = [];
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
    items.push({ productType, materialPhotoUrl });
  }

  const defaultStage = await prisma.pipelineStage.findFirst({
    where: { pipeline: "PRODUCTION", isDefault: true },
  });
  if (!defaultStage) throw new Error("Өндіріс pipeline-ы бапталмаған");

  const order = await prisma.productionOrder.create({
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
      items: { create: items },
    },
  });

  revalidatePath("/production");
  if (dealId) revalidatePath(`/crm/deals/${dealId}`);
  return order.id;
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
