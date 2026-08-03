"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { applyStockMovement } from "@/lib/stock";

export type FormState = { error?: string } | undefined;

/** Manual correction (стеллаж есептеу, брак, т.б.) — `delta` can be positive or negative. */
export async function createStockAdjustment(_prevState: FormState, formData: FormData): Promise<FormState> {
  const session = await requirePermission(PERMISSIONS.WAREHOUSE_MANAGE);

  const productId = formData.get("productId");
  const warehouseId = formData.get("warehouseId");
  const delta = Number(formData.get("delta"));
  const note = formData.get("note");

  if (typeof productId !== "string" || !productId) return { error: "Тауарды таңдаңыз" };
  if (typeof warehouseId !== "string" || !warehouseId) return { error: "Складты таңдаңыз" };
  if (!Number.isFinite(delta) || delta === 0) return { error: "Саны 0 болмауы керек" };

  await prisma.$transaction(async (tx) => {
    await applyStockMovement(tx, {
      productId,
      warehouseId,
      type: "ADJUSTMENT",
      quantity: delta,
      reason: "manual_adjustment",
      note: typeof note === "string" && note.trim() ? note.trim() : undefined,
      createdById: session.user.id,
    });
  });

  revalidatePath("/warehouse");
  revalidatePath(`/warehouse/products/${productId}`);
}
