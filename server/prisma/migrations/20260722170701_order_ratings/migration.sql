-- CreateTable
CREATE TABLE "OrderRating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderRating_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderRating_orderId_key" ON "OrderRating"("orderId");

-- CreateIndex
CREATE INDEX "OrderRating_domain_itemKey_idx" ON "OrderRating"("domain", "itemKey");

-- CreateIndex
CREATE INDEX "OrderRating_userId_idx" ON "OrderRating"("userId");
