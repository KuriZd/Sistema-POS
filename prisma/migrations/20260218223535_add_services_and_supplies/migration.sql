-- CreateTable
CREATE TABLE "ServiceSupply" (
    "serviceId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("serviceId", "productId"),
    CONSTRAINT "ServiceSupply_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceSupply_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ServiceSupply_productId_idx" ON "ServiceSupply"("productId");
