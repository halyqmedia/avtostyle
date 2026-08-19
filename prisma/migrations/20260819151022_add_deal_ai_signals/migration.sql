-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "aiSignals" TEXT[] DEFAULT ARRAY[]::TEXT[];
