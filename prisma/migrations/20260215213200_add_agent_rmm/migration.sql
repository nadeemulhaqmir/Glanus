-- CreateEnum
CREATE TYPE "AgentPlatform" AS ENUM ('WINDOWS', 'MACOS', 'LINUX');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('ONLINE', 'OFFLINE', 'INSTALLING', 'ERROR', 'UPDATING');

-- CreateEnum
CREATE TYPE "ScriptStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'TIMEOUT');

-- AlterEnum
ALTER TYPE "AssignmentStatus" ADD VALUE 'CANCELLED';

-- CreateTable
CREATE TABLE "AgentConnection" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "agentVersion" TEXT NOT NULL,
    "platform" "AgentPlatform" NOT NULL,
    "hostname" TEXT NOT NULL,
    "ipAddress" TEXT,
    "macAddress" TEXT,
    "authToken" TEXT NOT NULL,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "AgentStatus" NOT NULL DEFAULT 'INSTALLING',
    "canMonitor" BOOLEAN NOT NULL DEFAULT true,
    "canRemoteAccess" BOOLEAN NOT NULL DEFAULT false,
    "canExecuteScript" BOOLEAN NOT NULL DEFAULT true,
    "canPatchManage" BOOLEAN NOT NULL DEFAULT false,
    "cpuUsage" DOUBLE PRECISION,
    "ramUsage" DOUBLE PRECISION,
    "diskUsage" DOUBLE PRECISION,
    "networkUp" DOUBLE PRECISION,
    "networkDown" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentMetric" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cpuUsage" DOUBLE PRECISION NOT NULL,
    "cpuTemp" DOUBLE PRECISION,
    "ramUsage" DOUBLE PRECISION NOT NULL,
    "ramUsed" DOUBLE PRECISION NOT NULL,
    "ramTotal" DOUBLE PRECISION NOT NULL,
    "diskUsage" DOUBLE PRECISION NOT NULL,
    "diskUsed" DOUBLE PRECISION NOT NULL,
    "diskTotal" DOUBLE PRECISION NOT NULL,
    "networkUp" DOUBLE PRECISION NOT NULL,
    "networkDown" DOUBLE PRECISION NOT NULL,
    "topProcesses" JSONB,

    CONSTRAINT "AgentMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScriptExecution" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "scriptName" TEXT NOT NULL,
    "scriptBody" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "status" "ScriptStatus" NOT NULL DEFAULT 'PENDING',
    "exitCode" INTEGER,
    "output" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "ScriptExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentConnection_assetId_key" ON "AgentConnection"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentConnection_authToken_key" ON "AgentConnection"("authToken");

-- CreateIndex
CREATE INDEX "AgentConnection_workspaceId_status_idx" ON "AgentConnection"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "AgentConnection_lastSeen_idx" ON "AgentConnection"("lastSeen");

-- CreateIndex
CREATE INDEX "AgentConnection_status_idx" ON "AgentConnection"("status");

-- CreateIndex
CREATE INDEX "AgentMetric_agentId_timestamp_idx" ON "AgentMetric"("agentId", "timestamp");

-- CreateIndex
CREATE INDEX "AgentMetric_assetId_timestamp_idx" ON "AgentMetric"("assetId", "timestamp");

-- CreateIndex
CREATE INDEX "ScriptExecution_agentId_status_idx" ON "ScriptExecution"("agentId", "status");

-- CreateIndex
CREATE INDEX "ScriptExecution_assetId_createdAt_idx" ON "ScriptExecution"("assetId", "createdAt");

-- CreateIndex
CREATE INDEX "ScriptExecution_workspaceId_createdAt_idx" ON "ScriptExecution"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "ScriptExecution_status_idx" ON "ScriptExecution"("status");

-- AddForeignKey
ALTER TABLE "AgentConnection" ADD CONSTRAINT "AgentConnection_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentConnection" ADD CONSTRAINT "AgentConnection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentMetric" ADD CONSTRAINT "AgentMetric_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentMetric" ADD CONSTRAINT "AgentMetric_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptExecution" ADD CONSTRAINT "ScriptExecution_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptExecution" ADD CONSTRAINT "ScriptExecution_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptExecution" ADD CONSTRAINT "ScriptExecution_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
