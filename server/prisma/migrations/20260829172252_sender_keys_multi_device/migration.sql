/*
  Warnings:

  - You are about to drop the `GroupKeyEnvelope` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "GroupKeyEnvelope_cartId_userId_deviceId_key";

-- DropIndex
DROP INDEX "GroupKeyEnvelope_cartId_idx";

-- AlterTable
ALTER TABLE "ChatDevice" ADD COLUMN "signingKey" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "GroupKeyEnvelope";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "SenderKeyEnvelope" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cartId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderDevice" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "recipientDevice" TEXT NOT NULL,
    "senderKey" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SenderKeyEnvelope_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "GroupCart" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SenderKeyEnvelope_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SenderKeyEnvelope_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HistorySync" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cartId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromDevice" TEXT NOT NULL,
    "toDevice" TEXT NOT NULL,
    "senderKey" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HistorySync_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "GroupCart" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HistorySync_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GroupMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cartId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderDevice" TEXT NOT NULL DEFAULT '',
    "index" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 2,
    "iv" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "signature" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupMessage_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "GroupCart" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_GroupMessage" ("cartId", "ciphertext", "createdAt", "id", "iv", "senderId") SELECT "cartId", "ciphertext", "createdAt", "id", "iv", "senderId" FROM "GroupMessage";
DROP TABLE "GroupMessage";
ALTER TABLE "new_GroupMessage" RENAME TO "GroupMessage";
CREATE INDEX "GroupMessage_cartId_createdAt_idx" ON "GroupMessage"("cartId", "createdAt");
CREATE INDEX "GroupMessage_cartId_senderDevice_index_idx" ON "GroupMessage"("cartId", "senderDevice", "index");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SenderKeyEnvelope_cartId_recipientDevice_idx" ON "SenderKeyEnvelope"("cartId", "recipientDevice");

-- CreateIndex
CREATE UNIQUE INDEX "SenderKeyEnvelope_cartId_senderDevice_recipientDevice_key" ON "SenderKeyEnvelope"("cartId", "senderDevice", "recipientDevice");

-- CreateIndex
CREATE INDEX "HistorySync_cartId_userId_idx" ON "HistorySync"("cartId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "HistorySync_cartId_toDevice_key" ON "HistorySync"("cartId", "toDevice");
