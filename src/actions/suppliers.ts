"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";

const createSupplierSchema = z.object({
  name: z.string().min(2, "Атауын енгізіңіз"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export type FormState = { error?: string } | undefined;

export async function createSupplier(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requirePermission(PERMISSIONS.WAREHOUSE_MANAGE);

  const parsed = createSupplierSchema.safeParse({
    name: formData.get("name"),
    contactPerson: formData.get("contactPerson") || undefined,
    phone: formData.get("phone") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Деректер дұрыс емес" };

  await prisma.supplier.create({
    data: {
      name: parsed.data.name,
      contactPerson: parsed.data.contactPerson || null,
      phone: parsed.data.phone || null,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath("/warehouse/suppliers");
}
