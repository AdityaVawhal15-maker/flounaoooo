-- CreateTable
CREATE TABLE "GroupCartMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cartId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupCartMember_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "GroupCart" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupCartMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "GroupCartMember_userId_idx" ON "GroupCartMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupCartMember_cartId_userId_key" ON "GroupCartMember"("cartId", "userId");
