-- AlterTable
ALTER TABLE "RefreshToken" ADD COLUMN "ip" TEXT;
ALTER TABLE "RefreshToken" ADD COLUMN "lastUsedAt" DATETIME;
ALTER TABLE "RefreshToken" ADD COLUMN "userAgent" TEXT;

-- CreateTable
CREATE TABLE "BlockedUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "blockedUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BlockedUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BlockedUser_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeviceLock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" DATETIME,
    CONSTRAINT "DeviceLock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "googleId" TEXT,
    "phone" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "avatarUrl" TEXT,
    "dateOfBirth" TEXT,
    "gender" TEXT,
    "weeklyFoodBudgetPaise" INTEGER,
    "emailUpdates" BOOLEAN NOT NULL DEFAULT true,
    "smartSuggestions" BOOLEAN NOT NULL DEFAULT true,
    "emailMoneyUpdates" BOOLEAN NOT NULL DEFAULT true,
    "emailTips" BOOLEAN NOT NULL DEFAULT true,
    "shareLocation" BOOLEAN NOT NULL DEFAULT true,
    "profileVisibility" TEXT NOT NULL DEFAULT 'everyone',
    "activityStatus" BOOLEAN NOT NULL DEFAULT true,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "plusActive" BOOLEAN NOT NULL DEFAULT false,
    "plusSince" DATETIME,
    "plusUntil" DATETIME,
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "role" TEXT NOT NULL DEFAULT 'user',
    "suspendedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("avatarUrl", "createdAt", "dateOfBirth", "email", "emailMoneyUpdates", "emailTips", "emailUpdates", "emailVerified", "failedLogins", "gender", "googleId", "id", "lockedUntil", "name", "passwordHash", "phone", "phoneVerified", "plusActive", "plusSince", "plusUntil", "role", "shareLocation", "smartSuggestions", "suspendedAt", "updatedAt", "weeklyFoodBudgetPaise") SELECT "avatarUrl", "createdAt", "dateOfBirth", "email", "emailMoneyUpdates", "emailTips", "emailUpdates", "emailVerified", "failedLogins", "gender", "googleId", "id", "lockedUntil", "name", "passwordHash", "phone", "phoneVerified", "plusActive", "plusSince", "plusUntil", "role", "shareLocation", "smartSuggestions", "suspendedAt", "updatedAt", "weeklyFoodBudgetPaise" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "BlockedUser_userId_idx" ON "BlockedUser"("userId");

-- CreateIndex
CREATE INDEX "BlockedUser_blockedUserId_idx" ON "BlockedUser"("blockedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedUser_userId_blockedUserId_key" ON "BlockedUser"("userId", "blockedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceLock_credentialId_key" ON "DeviceLock"("credentialId");

-- CreateIndex
CREATE INDEX "DeviceLock_userId_idx" ON "DeviceLock"("userId");
