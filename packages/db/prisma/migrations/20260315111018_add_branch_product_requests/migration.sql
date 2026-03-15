-- CreateEnum
CREATE TYPE "ProductRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FULFILLED');

-- CreateTable
CREATE TABLE "BranchProductRequest" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "requestedQty" INTEGER NOT NULL,
    "status" "ProductRequestStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchProductRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BranchProductRequest_branchId_status_createdAt_idx" ON "BranchProductRequest"("branchId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "BranchProductRequest_productId_status_createdAt_idx" ON "BranchProductRequest"("productId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "BranchProductRequest_createdByUserId_createdAt_idx" ON "BranchProductRequest"("createdByUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "BranchProductRequest" ADD CONSTRAINT "BranchProductRequest_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchProductRequest" ADD CONSTRAINT "BranchProductRequest_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchProductRequest" ADD CONSTRAINT "BranchProductRequest_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
