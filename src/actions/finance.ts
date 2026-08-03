"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { postTransaction, type TransactionCategory } from "@/lib/transactions";

const MANUAL_CATEGORIES = ["salary", "rent", "utilities", "commission", "material_purchase", "other"] as const;

const createTransactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.enum(MANUAL_CATEGORIES),
  amount: z.coerce.number().positive("Сома 0-ден үлкен болуы керек"),
  description: z.string().optional(),
  date: z.string().optional(),
  userId: z.string().optional(),
});

export type FormState = { error?: string } | undefined;

export async function createManualTransaction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const session = await requirePermission(PERMISSIONS.FINANCE_MANAGE);

  const parsed = createTransactionSchema.safeParse({
    type: formData.get("type"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    description: formData.get("description") || undefined,
    date: formData.get("date") || undefined,
    userId: formData.get("userId") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Деректер дұрыс емес" };

  await prisma.$transaction(async (tx) => {
    await postTransaction(tx, {
      type: parsed.data.type,
      category: parsed.data.category as TransactionCategory,
      amount: parsed.data.amount,
      description: parsed.data.description,
      date: parsed.data.date ? new Date(parsed.data.date) : undefined,
      userId: parsed.data.userId || undefined,
      createdById: session.user.id,
    });
  });

  revalidatePath("/finance");
  revalidatePath("/finance/transactions");
}
