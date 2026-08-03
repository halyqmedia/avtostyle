"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";

const createWarehouseSchema = z.object({
  name: z.string().min(2, "Атауын енгізіңіз"),
});

export type FormState = { error?: string } | undefined;

export async function createWarehouse(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requirePermission(PERMISSIONS.WAREHOUSE_MANAGE);

  const parsed = createWarehouseSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Деректер дұрыс емес" };

  await prisma.warehouse.create({ data: { name: parsed.data.name } });

  revalidatePath("/warehouse/warehouses");
}
