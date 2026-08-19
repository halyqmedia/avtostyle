/*
  Warnings:

  - You are about to drop the column `fullName` on the `campaign_recipients` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `campaign_recipients` table. All the data in the column will be lost.
  - Added the required column `contactId` to the `campaign_recipients` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "campaign_recipients" DROP COLUMN "fullName",
DROP COLUMN "phone",
ADD COLUMN     "contactId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "fullName" TEXT,
    "city" TEXT,
    "profession" TEXT,
    "category" TEXT,
    "status" TEXT DEFAULT 'Жаңа',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "clientId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contacts_phone_key" ON "contacts"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_clientId_key" ON "contacts"("clientId");

-- CreateIndex
CREATE INDEX "campaign_recipients_contactId_idx" ON "campaign_recipients"("contactId");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
