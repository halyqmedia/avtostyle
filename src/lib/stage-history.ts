import type { Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

export async function writeStageHistory(
  tx: TxClient,
  args: {
    entityType: string;
    entityId: string;
    fromStageId: string | null;
    toStageId: string;
    movedById: string;
    note?: string;
    photoUrl?: string;
  },
) {
  return tx.stageHistory.create({
    data: {
      entityType: args.entityType,
      entityId: args.entityId,
      fromStageId: args.fromStageId,
      toStageId: args.toStageId,
      movedById: args.movedById,
      note: args.note,
      photoUrl: args.photoUrl,
    },
  });
}
