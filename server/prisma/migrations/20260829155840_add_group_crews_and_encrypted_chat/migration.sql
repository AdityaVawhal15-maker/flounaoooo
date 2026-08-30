-- CreateTable
CREATE TABLE "GroupCrew" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT,
    "domain" TEXT NOT NULL DEFAULT 'food',
    "platform" TEXT NOT NULL,
    "lastCartId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GroupCrew_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GroupCrewMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "crewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupCrewMember_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "GroupCrew" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupCrewMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatDevice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "label" TEXT,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GroupKeyEnvelope" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cartId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "senderKey" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "wrappedKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupKeyEnvelope_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "GroupCart" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupKeyEnvelope_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GroupMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cartId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupMessage_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "GroupCart" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GroupCart" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "domain" TEXT NOT NULL DEFAULT 'food',
    "platform" TEXT NOT NULL,
    "rideDetails" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "name" TEXT,
    "emoji" TEXT,
    "crewId" TEXT,
    "orderId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GroupCart_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupCart_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "GroupCrew" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_GroupCart" ("code", "createdAt", "domain", "hostId", "id", "orderId", "platform", "rideDetails", "status", "updatedAt") SELECT "code", "createdAt", "domain", "hostId", "id", "orderId", "platform", "rideDetails", "status", "updatedAt" FROM "GroupCart";
DROP TABLE "GroupCart";
ALTER TABLE "new_GroupCart" RENAME TO "GroupCart";
CREATE UNIQUE INDEX "GroupCart_code_key" ON "GroupCart"("code");
CREATE INDEX "GroupCart_hostId_idx" ON "GroupCart"("hostId");
CREATE INDEX "GroupCart_crewId_idx" ON "GroupCart"("crewId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "GroupCrew_ownerId_idx" ON "GroupCrew"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupCrew_ownerId_name_domain_key" ON "GroupCrew"("ownerId", "name", "domain");

-- CreateIndex
CREATE INDEX "GroupCrewMember_userId_idx" ON "GroupCrewMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupCrewMember_crewId_userId_key" ON "GroupCrewMember"("crewId", "userId");

-- CreateIndex
CREATE INDEX "ChatDevice_userId_idx" ON "ChatDevice"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatDevice_userId_deviceId_key" ON "ChatDevice"("userId", "deviceId");

-- CreateIndex
CREATE INDEX "GroupKeyEnvelope_cartId_idx" ON "GroupKeyEnvelope"("cartId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupKeyEnvelope_cartId_userId_deviceId_key" ON "GroupKeyEnvelope"("cartId", "userId", "deviceId");

-- CreateIndex
CREATE INDEX "GroupMessage_cartId_createdAt_idx" ON "GroupMessage"("cartId", "createdAt");
