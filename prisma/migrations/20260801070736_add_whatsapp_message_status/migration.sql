-- AlterTable
ALTER TABLE "whatsapp_messages" ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'SENT';

-- CreateIndex
CREATE INDEX "whatsapp_messages_whatsappMessageId_idx" ON "whatsapp_messages"("whatsappMessageId");
