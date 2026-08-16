-- CreateTable
CREATE TABLE "DecisionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "domain" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "weights" TEXT NOT NULL,
    "personalized" BOOLEAN NOT NULL DEFAULT false,
    "candidateCount" INTEGER NOT NULL,
    "excludedCount" INTEGER NOT NULL,
    "exclusions" TEXT,
    "results" TEXT NOT NULL,
    "chosenKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "DecisionLog_domain_createdAt_idx" ON "DecisionLog"("domain", "createdAt");

-- CreateIndex
CREATE INDEX "DecisionLog_userId_idx" ON "DecisionLog"("userId");
