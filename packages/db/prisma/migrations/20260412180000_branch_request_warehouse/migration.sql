-- AlterTable
ALTER TABLE "BranchProductRequest" ADD COLUMN "warehouseId" TEXT;

-- AddForeignKey
ALTER TABLE "BranchProductRequest" ADD CONSTRAINT "BranchProductRequest_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "BranchProductRequest_warehouseId_idx" ON "BranchProductRequest"("warehouseId");
