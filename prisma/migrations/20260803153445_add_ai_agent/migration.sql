-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "aiEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "whatsapp_messages" ADD COLUMN     "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "completionTokens" INTEGER,
ADD COLUMN     "promptTokens" INTEGER;

-- CreateTable
CREATE TABLE "ai_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "systemPrompt" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'gemini-3.5-flash-lite',
    "maxHistoryMessages" INTEGER NOT NULL DEFAULT 10,
    "maxOutputTokens" INTEGER NOT NULL DEFAULT 300,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "ai_settings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

