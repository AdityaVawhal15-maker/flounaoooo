-- CreateTable
CREATE TABLE "OndcTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "txnId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "orderId" TEXT,
    "bppId" TEXT,
    "request" TEXT,
    "response" TEXT,
    "status" TEXT NOT NULL,
    "signed" BOOLEAN NOT NULL DEFAULT true,
    "latencyMs" INTEGER,
    "simulated" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "OndcTransaction_txnId_idx" ON "OndcTransaction"("txnId");

-- CreateIndex
CREATE INDEX "OndcTransaction_action_createdAt_idx" ON "OndcTransaction"("action", "createdAt");

-- CreateIndex
CREATE INDEX "OndcTransaction_orderId_idx" ON "OndcTransaction"("orderId");
