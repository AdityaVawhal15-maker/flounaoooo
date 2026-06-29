-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'read',
    "createdById" TEXT,
    "lastUsedAt" DATETIME,
    "callCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PlatformConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL DEFAULT 'default',
    "ondcMinMarginBps" INTEGER NOT NULL DEFAULT 300,
    "ondcMaxMarginBps" INTEGER NOT NULL DEFAULT 600,
    "partnerAffiliateMinBps" INTEGER NOT NULL DEFAULT 120,
    "cashbackUserSharePct" INTEGER NOT NULL DEFAULT 30,
    "apiFailureRatePct" INTEGER NOT NULL DEFAULT 1,
    "decisionLatencyAlertSec" INTEGER NOT NULL DEFAULT 5,
    "ondcPingAlertMs" INTEGER NOT NULL DEFAULT 500,
    "updatedById" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_prefix_key" ON "ApiKey"("prefix");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_revokedAt_idx" ON "ApiKey"("revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformConfig_key_key" ON "PlatformConfig"("key");
