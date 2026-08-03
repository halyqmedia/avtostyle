-- AlterTable
ALTER TABLE "whatsapp_messages" ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "mediaMimeType" TEXT,
ADD COLUMN     "mediaUrl" TEXT,
ADD COLUMN     "messageType" TEXT NOT NULL DEFAULT 'text';
