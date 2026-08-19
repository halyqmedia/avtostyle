-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "aiAnalyzedAt" TIMESTAMP(3),
ADD COLUMN     "aiNextAction" TEXT,
ADD COLUMN     "aiSummary" TEXT,
ADD COLUMN     "aiTemperature" TEXT;
