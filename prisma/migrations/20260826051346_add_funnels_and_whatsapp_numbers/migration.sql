-- CreateTable
CREATE TABLE "funnels" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT false,
    "systemPrompt" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'gemini-3.5-flash-lite',
    "maxHistoryMessages" INTEGER NOT NULL DEFAULT 10,
    "maxOutputTokens" INTEGER NOT NULL DEFAULT 300,
    "kpMediaKeyKk" TEXT,
    "kpMediaKeyRu" TEXT,
    "catalogMediaKeyKk" TEXT,
    "catalogMediaKeyRu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "funnels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_numbers" (
    "id" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "accessToken" TEXT,
    "funnelId" TEXT NOT NULL,
    "managerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "funnels_key_key" ON "funnels"("key");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_numbers_phoneNumberId_key" ON "whatsapp_numbers"("phoneNumberId");

-- AddForeignKey
ALTER TABLE "funnels" ADD CONSTRAINT "funnels_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_numbers" ADD CONSTRAINT "whatsapp_numbers_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "funnels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_numbers" ADD CONSTRAINT "whatsapp_numbers_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data migration: carry the old singleton AiSettings row (id='default') over to a first "SALES"
-- Funnel row, so the live AI script/КП files aren't lost when ai_settings is dropped below.
INSERT INTO "funnels" ("id", "key", "name", "isActive", "aiEnabled", "systemPrompt", "model", "maxHistoryMessages", "maxOutputTokens", "kpMediaKeyKk", "kpMediaKeyRu", "catalogMediaKeyKk", "catalogMediaKeyRu", "createdAt", "updatedAt", "updatedById")
SELECT gen_random_uuid()::text, 'SALES', 'Негізгі воронка', true, "enabled", "systemPrompt", "model", "maxHistoryMessages", "maxOutputTokens", "kpMediaKeyKk", "kpMediaKeyRu", "catalogMediaKeyKk", "catalogMediaKeyRu", now(), "updatedAt", "updatedById"
FROM "ai_settings" WHERE "id" = 'default';

-- Fallback for a fresh install with no ai_settings row yet — a SALES funnel must always exist.
INSERT INTO "funnels" ("id", "key", "name", "isActive", "aiEnabled", "systemPrompt", "model", "maxHistoryMessages", "maxOutputTokens", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'SALES', 'Негізгі воронка', true, false,
       'Сен Avtostyle компаниясының сату менеджерісің. Клиентпен WhatsApp арқылы қазақша/орысша сөйлес, қысқа әрі нақты жауап бер.',
       'gemini-3.5-flash-lite', 10, 300, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "funnels" WHERE "key" = 'SALES');

-- Register the currently env-configured WhatsApp number against that SALES funnel, so existing
-- traffic keeps resolving to the same funnel/AI settings once phone_number_id-based routing goes
-- live. Manager is left unassigned (admin fills it in from /admin/whatsapp-numbers).
INSERT INTO "whatsapp_numbers" ("id", "phoneNumberId", "label", "funnelId", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, '1224963974037350', 'Негізгі нөмір (SALES)', "id", true, now(), now()
FROM "funnels" WHERE "key" = 'SALES'
ON CONFLICT ("phoneNumberId") DO NOTHING;

-- DropForeignKey
ALTER TABLE "ai_settings" DROP CONSTRAINT "ai_settings_updatedById_fkey";

-- DropTable
DROP TABLE "ai_settings";

-- AlterTable
ALTER TABLE "deals" ADD COLUMN "whatsappNumberId" TEXT;

-- CreateIndex
CREATE INDEX "deals_whatsappNumberId_idx" ON "deals"("whatsappNumberId");

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_whatsappNumberId_fkey" FOREIGN KEY ("whatsappNumberId") REFERENCES "whatsapp_numbers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
