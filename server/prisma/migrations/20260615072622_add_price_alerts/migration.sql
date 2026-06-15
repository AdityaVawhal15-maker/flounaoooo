-- CreateTable
CREATE TABLE "PriceAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "targetPaise" INTEGER NOT NULL,
    "lastSeenPaise" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "triggeredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PriceAlert_userId_active_idx" ON "PriceAlert"("userId", "active");

-- CreateIndex
CREATE INDEX "PriceAlert_domain_itemKey_active_idx" ON "PriceAlert"("domain", "itemKey", "active");
