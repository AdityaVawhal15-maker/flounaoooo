-- CreateTable
CREATE TABLE "PriceObservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "domain" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "hour" INTEGER NOT NULL,
    "weekday" INTEGER NOT NULL,
    "bestPaise" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "PriceObservation_domain_key_hour_idx" ON "PriceObservation"("domain", "key", "hour");
