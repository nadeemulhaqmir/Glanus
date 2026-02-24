/*
  Warnings:

  - You are about to drop the column `categoryLegacy` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `entityId` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `entityType` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `stripeCustomerId` on the `Workspace` table. All the data in the column will be lost.
  - Made the column `workspaceId` on table `Asset` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "AuditLog_createdAt_idx";

-- DropIndex
DROP INDEX "Subscription_stripeCustomerId_idx";

-- DropIndex
DROP INDEX "Workspace_stripeCustomerId_key";

-- AlterTable
ALTER TABLE "AIInsight" ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "Asset" DROP COLUMN "categoryLegacy",
ALTER COLUMN "workspaceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "entityId",
DROP COLUMN "entityType",
ADD COLUMN     "details" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "resourceId" TEXT,
ADD COLUMN     "resourceType" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "RemoteSession" ADD COLUMN     "answer" JSONB,
ADD COLUMN     "averageFPS" DOUBLE PRECISION,
ADD COLUMN     "averageLatency" DOUBLE PRECISION,
ADD COLUMN     "iceCandidates" JSONB,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "offer" JSONB,
ADD COLUMN     "quality" TEXT DEFAULT 'high';

-- AlterTable
ALTER TABLE "Workspace" DROP COLUMN "stripeCustomerId";

-- CreateTable
CREATE TABLE "ActionQueueItem" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "ruleSnapshot" JSONB NOT NULL,
    "consequence" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3),
    "result" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionQueueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActionQueueItem_workspaceId_idx" ON "ActionQueueItem"("workspaceId");

-- CreateIndex
CREATE INDEX "ActionQueueItem_status_idx" ON "ActionQueueItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "StripeEvent_eventId_key" ON "StripeEvent"("eventId");

-- CreateIndex
CREATE INDEX "StripeEvent_eventId_idx" ON "StripeEvent"("eventId");

-- CreateIndex
CREATE INDEX "StripeEvent_createdAt_idx" ON "StripeEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AIInsight_workspaceId_idx" ON "AIInsight"("workspaceId");

-- CreateIndex
CREATE INDEX "AuditLog_workspaceId_createdAt_idx" ON "AuditLog"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- AddForeignKey
ALTER TABLE "ActionQueueItem" ADD CONSTRAINT "ActionQueueItem_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInsight" ADD CONSTRAINT "AIInsight_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
