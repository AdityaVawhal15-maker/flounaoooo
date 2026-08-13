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
INSERT INTO "new_User" ("avatarUrl", "createdAt", "dateOfBirth", "email", "emailMoneyUpdates", "emailTips", "emailUpdates", "emailVerified", "failedLogins", "gender", "googleId", "id", "lockedUntil", "name", "passwordHash", "phone", "phoneVerified", "plusActive", "plusSince", "plusUntil", "role", "smartSuggestions", "suspendedAt", "updatedAt", "weeklyFoodBudgetPaise") SELECT "avatarUrl", "createdAt", "dateOfBirth", "email", "emailMoneyUpdates", "emailTips", "emailUpdates", "emailVerified", "failedLogins", "gender", "googleId", "id", "lockedUntil", "name", "passwordHash", "phone", "phoneVerified", "plusActive", "plusSince", "plusUntil", "role", "smartSuggestions", "suspendedAt", "updatedAt", "weeklyFoodBudgetPaise" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
