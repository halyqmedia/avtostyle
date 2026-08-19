-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "headerMetaMediaId" TEXT;

-- AlterTable
ALTER TABLE "whatsapp_templates" ADD COLUMN     "headerFileName" TEXT,
ADD COLUMN     "headerMediaKey" TEXT,
ADD COLUMN     "headerMimeType" TEXT,
ADD COLUMN     "headerType" TEXT;
