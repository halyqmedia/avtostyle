import type { Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

/**
 * Writes one StockMovement row and keeps the materialized Stock.quantity in sync,
 * inside the caller's transaction. `quantity` is signed: positive increases the
 * balance (IN / upward adjustment), negative decreases it (OUT / downward adjustment).
 */
export async function applyStockMovement(
  tx: TxClient,
  args: {
    productId: string;
    warehouseId: string;
    type: "IN" | "OUT" | "ADJUSTMENT";
    quantity: number;
    reason: "purchase_order" | "production_order" | "manual_adjustment";
    refId?: string;
    note?: string;
    createdById: string;
  },
) {
  const stock = await tx.stock.upsert({
    where: {
      productId_warehouseId: {
        productId: args.productId,
        warehouseId: args.warehouseId,
      },
    },
    update: {},
    create: {
      productId: args.productId,
      warehouseId: args.warehouseId,
      quantity: 0,
    },
  });

  const balanceAfter = Number(stock.quantity) + args.quantity;

  await tx.stock.update({
    where: {
      productId_warehouseId: {
        productId: args.productId,
        warehouseId: args.warehouseId,
      },
    },
    data: { quantity: balanceAfter },
  });

  return tx.stockMovement.create({
    data: {
      productId: args.productId,
      warehouseId: args.warehouseId,
      type: args.type,
      quantity: args.quantity,
      balanceAfter,
      reason: args.reason,
      refId: args.refId,
      note: args.note,
      createdById: args.createdById,
    },
  });
}
