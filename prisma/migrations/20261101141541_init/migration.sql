-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "BrainstormStatus" AS ENUM ('DRAFT', 'RUNNING', 'COMPLETED', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BrainstormMode" AS ENUM ('QUICK', 'ADVANCED');

-- CreateEnum
CREATE TYPE "MarketType" AS ENUM ('B2B', 'B2C', 'B2G');

-- CreateEnum
CREATE TYPE "Zone" AS ENUM ('LOCAL', 'REGIONAL', 'NATIONAL');

-- CreateEnum
CREATE TYPE "EvidenceKind" AS ENUM ('FACT', 'ESTIMATE', 'HYPOTHESIS', 'CONSTRAINT');

-- CreateEnum
CREATE TYPE "IdeaStatus" AS ENUM ('PROPOSED', 'ANALYZED', 'WITHIN_CONSTRAINTS', 'TO_VERIFY', 'REJECTED', 'CHOSEN');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AgentName" AS ENUM ('EXPLORER', 'INNOVATOR', 'ANALYST', 'TECHNICAL', 'DECIDER');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('PDF', 'JSON', 'MARKDOWN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "preferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brainstorm" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "mode" "BrainstormMode" NOT NULL DEFAULT 'QUICK',
    "status" "BrainstormStatus" NOT NULL DEFAULT 'DRAFT',
    "city" TEXT,
    "country" TEXT DEFAULT 'Maroc',
    "sector" TEXT,
    "subSector" TEXT,
    "knownProblem" TEXT,
    "description" TEXT,
    "budgetMaxMad" INTEGER,
    "deadlineDays" INTEGER,
    "teamSize" INTEGER,
    "availability" TEXT,
    "skills" TEXT[],
    "targetAudience" TEXT,
    "marketType" "MarketType",
    "zone" "Zone",
    "extra" JSONB,
    "weights" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brainstorm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrainstormVersion" (
    "id" TEXT NOT NULL,
    "brainstormId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrainstormVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Problem" (
    "id" TEXT NOT NULL,
    "brainstormId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "affectedUsers" TEXT,
    "consequences" TEXT,
    "frequency" INTEGER,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Problem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Idea" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pitch" TEXT NOT NULL,
    "aiValue" TEXT,
    "businessModel" TEXT,
    "mvpFeatures" JSONB,
    "status" "IdeaStatus" NOT NULL DEFAULT 'PROPOSED',
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Idea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "kind" "EvidenceKind" NOT NULL,
    "statement" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceTitle" TEXT,
    "excerpt" TEXT,
    "sourceDate" TIMESTAMP(3),
    "validation" TEXT,
    "problemId" TEXT,
    "ideaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketAnalysis" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "competitors" JSONB NOT NULL,
    "adoptionRisks" TEXT[],
    "fieldQuestions" TEXT[],
    "demandScore" INTEGER,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechEstimate" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "architecture" TEXT,
    "costMinMad" INTEGER NOT NULL,
    "costCentralMad" INTEGER NOT NULL,
    "costMaxMad" INTEGER NOT NULL,
    "costLines" JSONB NOT NULL,
    "durationMinDays" INTEGER NOT NULL,
    "durationMaxDays" INTEGER NOT NULL,
    "feasibility" INTEGER NOT NULL,
    "blockers" TEXT[],
    "securityNotes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TechEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "phase" TEXT,
    "hoursMin" DOUBLE PRECISION NOT NULL,
    "hoursMax" DOUBLE PRECISION NOT NULL,
    "dependsOn" TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "feasibility" INTEGER NOT NULL,
    "cost" INTEGER NOT NULL,
    "delay" INTEGER NOT NULL,
    "demand" INTEGER NOT NULL,
    "commercial" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "weights" JSONB NOT NULL,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "blockReasons" TEXT[],
    "rank" INTEGER,
    "rationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL,
    "brainstormId" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'QUEUED',
    "currentAgent" "AgentName",
    "startFrom" "AgentName",
    "jobId" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentExecution" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "agent" "AgentName" NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'QUEUED',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "model" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "output" JSONB,
    "logs" TEXT[],
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "AgentExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comparison" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ideaIds" TEXT[],
    "weights" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comparison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "brainstormId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "format" "ReportFormat" NOT NULL,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agent" "AgentName",
    "model" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Brainstorm_userId_updatedAt_idx" ON "Brainstorm"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Brainstorm_userId_status_idx" ON "Brainstorm"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BrainstormVersion_brainstormId_version_key" ON "BrainstormVersion"("brainstormId", "version");

-- CreateIndex
CREATE INDEX "Problem_brainstormId_idx" ON "Problem"("brainstormId");

-- CreateIndex
CREATE INDEX "Idea_problemId_idx" ON "Idea"("problemId");

-- CreateIndex
CREATE INDEX "Evidence_problemId_idx" ON "Evidence"("problemId");

-- CreateIndex
CREATE INDEX "Evidence_ideaId_idx" ON "Evidence"("ideaId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketAnalysis_ideaId_key" ON "MarketAnalysis"("ideaId");

-- CreateIndex
CREATE UNIQUE INDEX "TechEstimate_ideaId_key" ON "TechEstimate"("ideaId");

-- CreateIndex
CREATE INDEX "Task_ideaId_idx" ON "Task"("ideaId");

-- CreateIndex
CREATE UNIQUE INDEX "Score_ideaId_key" ON "Score"("ideaId");

-- CreateIndex
CREATE INDEX "Run_brainstormId_createdAt_idx" ON "Run"("brainstormId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentExecution_runId_idx" ON "AgentExecution"("runId");

-- CreateIndex
CREATE INDEX "Comparison_userId_idx" ON "Comparison"("userId");

-- CreateIndex
CREATE INDEX "Report_brainstormId_idx" ON "Report"("brainstormId");

-- CreateIndex
CREATE INDEX "UsageRecord_userId_createdAt_idx" ON "UsageRecord"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brainstorm" ADD CONSTRAINT "Brainstorm_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrainstormVersion" ADD CONSTRAINT "BrainstormVersion_brainstormId_fkey" FOREIGN KEY ("brainstormId") REFERENCES "Brainstorm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_brainstormId_fkey" FOREIGN KEY ("brainstormId") REFERENCES "Brainstorm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketAnalysis" ADD CONSTRAINT "MarketAnalysis_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechEstimate" ADD CONSTRAINT "TechEstimate_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_brainstormId_fkey" FOREIGN KEY ("brainstormId") REFERENCES "Brainstorm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentExecution" ADD CONSTRAINT "AgentExecution_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comparison" ADD CONSTRAINT "Comparison_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_brainstormId_fkey" FOREIGN KEY ("brainstormId") REFERENCES "Brainstorm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
