-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "metaJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AuditLog" ("action", "createdAt", "id", "metaJson", "userId") SELECT "action", "createdAt", "id", "metaJson", "userId" FROM "AuditLog";
DROP TABLE "AuditLog";
ALTER TABLE "new_AuditLog" RENAME TO "AuditLog";
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE TABLE "new_CashMovement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sessionId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CashMovement_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CashSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CashMovement" ("amount", "createdAt", "id", "reason", "sessionId", "type") SELECT "amount", "createdAt", "id", "reason", "sessionId", "type" FROM "CashMovement";
DROP TABLE "CashMovement";
ALTER TABLE "new_CashMovement" RENAME TO "CashMovement";
CREATE TABLE "new_Payment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "saleId" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reference" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Payment" ("amount", "createdAt", "id", "method", "reference", "saleId") SELECT "amount", "createdAt", "id", "method", "reference", "saleId" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
CREATE TABLE "new_Sale" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "folio" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "subtotal" INTEGER NOT NULL,
    "tax" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "cashierId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sale_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Sale" ("cashierId", "createdAt", "folio", "id", "status", "subtotal", "tax", "total") SELECT "cashierId", "createdAt", "folio", "id", "status", "subtotal", "tax", "total" FROM "Sale";
DROP TABLE "Sale";
ALTER TABLE "new_Sale" RENAME TO "Sale";
CREATE UNIQUE INDEX "Sale_folio_key" ON "Sale"("folio");
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
    CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SaleItem" ("createdAt", "discount", "id", "itemType", "lineTotal", "price", "productId", "qty", "saleId", "serviceId") SELECT "createdAt", "discount", "id", "itemType", "lineTotal", "price", "productId", "qty", "saleId", "serviceId" FROM "SaleItem";
DROP TABLE "SaleItem";
ALTER TABLE "new_SaleItem" RENAME TO "SaleItem";
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");
CREATE INDEX "SaleItem_productId_idx" ON "SaleItem"("productId");
CREATE INDEX "SaleItem_serviceId_idx" ON "SaleItem"("serviceId");
CREATE INDEX "SaleItem_itemType_idx" ON "SaleItem"("itemType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "InventoryMovement_productId_idx" ON "InventoryMovement"("productId");

-- CreateIndex
CREATE INDEX "InventoryMovement_type_idx" ON "InventoryMovement"("type");

-- CreateIndex
CREATE INDEX "ServiceSupply_serviceId_idx" ON "ServiceSupply"("serviceId");
