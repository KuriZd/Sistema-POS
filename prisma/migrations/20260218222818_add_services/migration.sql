-- CreateTable
CREATE TABLE "Service" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "profitPctBp" INTEGER NOT NULL DEFAULT 0,
    "durationMin" INTEGER NOT NULL DEFAULT 0,
    "taxRateBp" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SaleItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "saleId" INTEGER NOT NULL,
    "itemType" TEXT NOT NULL DEFAULT 'PRODUCT',
    "productId" INTEGER,
    "serviceId" INTEGER,
    "qty" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "lineTotal" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SaleItem" ("createdAt", "discount", "id", "lineTotal", "price", "productId", "qty", "saleId") SELECT "createdAt", "discount", "id", "lineTotal", "price", "productId", "qty", "saleId" FROM "SaleItem";
DROP TABLE "SaleItem";
ALTER TABLE "new_SaleItem" RENAME TO "SaleItem";
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");
CREATE INDEX "SaleItem_productId_idx" ON "SaleItem"("productId");
CREATE INDEX "SaleItem_serviceId_idx" ON "SaleItem"("serviceId");
CREATE INDEX "SaleItem_itemType_idx" ON "SaleItem"("itemType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Service_code_key" ON "Service"("code");
