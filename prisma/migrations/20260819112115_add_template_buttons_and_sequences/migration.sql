-- AlterTable
ALTER TABLE "whatsapp_templates" ADD COLUMN     "buttons" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "footerText" TEXT;

-- CreateTable
CREATE TABLE "sequences" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequence_steps" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "templateId" TEXT NOT NULL,
    "delayDays" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sequence_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequence_enrollments" (
    "id" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastSentAt" TIMESTAMP(3),
    "nextSendAt" TIMESTAMP(3),
    "dealId" TEXT,
    "whatsappMessageId" TEXT,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sequence_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sequence_steps_sequenceId_order_key" ON "sequence_steps"("sequenceId", "order");

-- CreateIndex
CREATE INDEX "sequence_enrollments_status_nextSendAt_idx" ON "sequence_enrollments"("status", "nextSendAt");

-- CreateIndex
CREATE UNIQUE INDEX "sequence_enrollments_sequenceId_contactId_key" ON "sequence_enrollments"("sequenceId", "contactId");

-- AddForeignKey
ALTER TABLE "sequences" ADD CONSTRAINT "sequences_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_steps" ADD CONSTRAINT "sequence_steps_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_steps" ADD CONSTRAINT "sequence_steps_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "whatsapp_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_enrollments" ADD CONSTRAINT "sequence_enrollments_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_enrollments" ADD CONSTRAINT "sequence_enrollments_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
