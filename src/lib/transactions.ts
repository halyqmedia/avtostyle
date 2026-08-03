import type { Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

export type TransactionCategory =
  | "sales_payment"
  | "commission"
  | "material_purchase"
  | "salary"
  | "rent"
  | "utilities"
  | "other";

/** Posts one ledger entry. `amount` is always positive — `type` carries the sign. */
export async function postTransaction(
  tx: TxClient,
  args: {
    type: "INCOME" | "EXPENSE";
    category: TransactionCategory;
    amount: number;
    description?: string;
    date?: Date;
    dealId?: string;
    productionOrderId?: string;
    purchaseOrderId?: string;
    userId?: string;
    createdById: string;
  },
) {
  if (args.amount <= 0) return null;
  return tx.transaction.create({
    data: {
      type: args.type,
      category: args.category,
      amount: args.amount,
      description: args.description,
      date: args.date ?? new Date(),
      dealId: args.dealId,
      productionOrderId: args.productionOrderId,
      purchaseOrderId: args.purchaseOrderId,
      userId: args.userId,
      createdById: args.createdById,
    },
  });
}

/**
 * Posts a sales payment (INCOME) and, if the assigned manager has a commissionRate,
 * their commission (EXPENSE) on that same payment — both dated together so monthly
 * reports and ОПиУ stay consistent.
 */
export async function postSalesPayment(
  tx: TxClient,
  args: {
    amount: number;
    dealId: string;
    assignedToId: string | null;
    createdById: string;
    description?: string;
  },
) {
  if (args.amount <= 0) return;

  await postTransaction(tx, {
    type: "INCOME",
    category: "sales_payment",
    amount: args.amount,
    dealId: args.dealId,
    description: args.description,
    createdById: args.createdById,
  });

  if (args.assignedToId) {
    const manager = await tx.user.findUnique({ where: { id: args.assignedToId } });
    const rate = manager?.commissionRate ? Number(manager.commissionRate) : 0;
    if (rate > 0) {
      const commission = Math.round(args.amount * (rate / 100) * 100) / 100;
      await postTransaction(tx, {
        type: "EXPENSE",
        category: "commission",
        amount: commission,
        dealId: args.dealId,
        userId: args.assignedToId,
        description: `Комиссия ${rate}%`,
        createdById: args.createdById,
      });
    }
  }
}
