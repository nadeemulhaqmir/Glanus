-- CreateEnum
CREATE TYPE "PartnerCertificationLevel" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('PENDING', 'VERIFIED', 'ACTIVE', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "ExamLevel" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('STARTED', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'ACTIVE', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED');

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "businessNumber" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "bio" TEXT,
    "logo" TEXT,
    "coverImage" TEXT,
    "certificationLevel" "PartnerCertificationLevel" NOT NULL DEFAULT 'BRONZE',
    "certifiedAt" TIMESTAMP(3),
    "status" "PartnerStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "address" TEXT,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT NOT NULL DEFAULT 'US',
    "timezone" TEXT,
    "serviceRadius" INTEGER,
    "remoteOnly" BOOLEAN NOT NULL DEFAULT false,
    "industries" JSONB,
    "certifications" JSONB,
    "languages" TEXT[] DEFAULT ARRAY['en']::TEXT[],
    "maxWorkspaces" INTEGER NOT NULL DEFAULT 10,
    "availableSlots" INTEGER NOT NULL DEFAULT 10,
    "acceptingNew" BOOLEAN NOT NULL DEFAULT true,
    "stripeAccountId" TEXT,
    "stripeOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "totalEarnings" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "averageRating" DECIMAL(3,2),
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerExam" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "level" "ExamLevel" NOT NULL,
    "status" "ExamStatus" NOT NULL,
    "questions" JSONB NOT NULL,
    "answers" JSONB NOT NULL,
    "score" INTEGER NOT NULL,
    "passingScore" INTEGER NOT NULL DEFAULT 80,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "timeLimit" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamQuestion" (
    "id" TEXT NOT NULL,
    "level" "ExamLevel" NOT NULL,
    "category" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctAnswer" INTEGER NOT NULL,
    "explanation" TEXT,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerAssignment" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "revenueSplit" DECIMAL(3,2) NOT NULL DEFAULT 0.50,
    "totalEarnings" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "rating" INTEGER,
    "review" TEXT,
    "ratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerPayout" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "stripePayoutId" TEXT,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "workspaceCount" INTEGER NOT NULL,
    "subscriptionDetails" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "PartnerPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Partner_userId_key" ON "Partner"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_stripeAccountId_key" ON "Partner"("stripeAccountId");

-- CreateIndex
CREATE INDEX "Partner_status_idx" ON "Partner"("status");

-- CreateIndex
CREATE INDEX "Partner_certificationLevel_idx" ON "Partner"("certificationLevel");

-- CreateIndex
CREATE INDEX "Partner_city_region_country_idx" ON "Partner"("city", "region", "country");

-- CreateIndex
CREATE INDEX "Partner_averageRating_idx" ON "Partner"("averageRating");

-- CreateIndex
CREATE INDEX "Partner_acceptingNew_idx" ON "Partner"("acceptingNew");

-- CreateIndex
CREATE INDEX "PartnerExam_partnerId_level_idx" ON "PartnerExam"("partnerId", "level");

-- CreateIndex
CREATE INDEX "PartnerExam_status_idx" ON "PartnerExam"("status");

-- CreateIndex
CREATE INDEX "ExamQuestion_level_isActive_idx" ON "ExamQuestion"("level", "isActive");

-- CreateIndex
CREATE INDEX "ExamQuestion_category_idx" ON "ExamQuestion"("category");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerAssignment_workspaceId_key" ON "PartnerAssignment"("workspaceId");

-- CreateIndex
CREATE INDEX "PartnerAssignment_partnerId_status_idx" ON "PartnerAssignment"("partnerId", "status");

-- CreateIndex
CREATE INDEX "PartnerAssignment_workspaceId_idx" ON "PartnerAssignment"("workspaceId");

-- CreateIndex
CREATE INDEX "PartnerAssignment_status_idx" ON "PartnerAssignment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerAssignment_partnerId_workspaceId_key" ON "PartnerAssignment"("partnerId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerPayout_stripePayoutId_key" ON "PartnerPayout"("stripePayoutId");

-- CreateIndex
CREATE INDEX "PartnerPayout_partnerId_status_idx" ON "PartnerPayout"("partnerId", "status");

-- CreateIndex
CREATE INDEX "PartnerPayout_periodStart_periodEnd_idx" ON "PartnerPayout"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "PartnerPayout_status_idx" ON "PartnerPayout"("status");

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerExam" ADD CONSTRAINT "PartnerExam_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerAssignment" ADD CONSTRAINT "PartnerAssignment_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerAssignment" ADD CONSTRAINT "PartnerAssignment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerPayout" ADD CONSTRAINT "PartnerPayout_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
