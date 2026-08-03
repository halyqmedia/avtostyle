-- AlterTable
ALTER TABLE "stage_history" ADD COLUMN     "photoUrl" TEXT;

-- CreateTable
CREATE TABLE "production_orders" (
    "id" TEXT NOT NULL,
    "dealId" TEXT,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "city" TEXT,
    "address" TEXT,
    "carBrand" TEXT,
    "carYear" TEXT,
    "carGeneration" TEXT,
    "paymentAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paymentType" TEXT,
    "remainingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "pipelineStageId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "materialPhotoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "production_orders_pipelineStageId_idx" ON "production_orders"("pipelineStageId");

-- CreateIndex
CREATE INDEX "production_orders_dealId_idx" ON "production_orders"("dealId");

-- CreateIndex
CREATE INDEX "production_order_items_orderId_idx" ON "production_order_items"("orderId");

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_pipelineStageId_fkey" FOREIGN KEY ("pipelineStageId") REFERENCES "pipeline_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_order_items" ADD CONSTRAINT "production_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "production_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
