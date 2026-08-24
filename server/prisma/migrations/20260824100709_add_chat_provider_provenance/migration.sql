-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN "provider" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN "providerDepth" INTEGER;

-- CreateIndex
CREATE INDEX "ChatMessage_provider_createdAt_idx" ON "ChatMessage"("provider", "createdAt");
