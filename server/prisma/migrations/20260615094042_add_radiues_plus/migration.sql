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
    "weeklyFoodBudgetPaise" INTEGER,
    "plusActive" BOOLEAN NOT NULL DEFAULT false,
    "plusSince" DATETIME,
    "plusUntil" DATETIME,
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("avatarUrl", "createdAt", "email", "emailVerified", "failedLogins", "googleId", "id", "lockedUntil", "name", "passwordHash", "phone", "phoneVerified", "updatedAt", "weeklyFoodBudgetPaise") SELECT "avatarUrl", "createdAt", "email", "emailVerified", "failedLogins", "googleId", "id", "lockedUntil", "name", "passwordHash", "phone", "phoneVerified", "updatedAt", "weeklyFoodBudgetPaise" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
