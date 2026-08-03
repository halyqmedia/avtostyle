"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";

const createProductSchema = z.object({
  name: z.string().min(2, "Атауын енгізіңіз"),
  sku: z.string().optional(),
  category: z.enum(["material", "finished"]),
  price: z.coerce.number().min(0, "Баға дұрыс емес").default(0),
  cost: z.coerce.number().min(0, "Өзіндік құн дұрыс емес").default(0),
  unit: z.string().min(1, "Өлшем бірлігін енгізіңіз").default("шт"),
});

export type FormState = { error?: string } | undefined;

export async function createProduct(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requirePermission(PERMISSIONS.WAREHOUSE_MANAGE);

  const parsed = createProductSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku") || undefined,
    category: formData.get("category"),
    price: formData.get("price") || 0,
    cost: formData.get("cost") || 0,
    unit: formData.get("unit") || "шт",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Деректер дұрыс емес" };

  await prisma.product.create({
    data: {
      name: parsed.data.name,
      sku: parsed.data.sku || null,
      category: parsed.data.category,
      price: parsed.data.price,
      cost: parsed.data.cost,
      unit: parsed.data.unit,
    },
  });

  revalidatePath("/warehouse");
  revalidatePath("/warehouse/products");
}
