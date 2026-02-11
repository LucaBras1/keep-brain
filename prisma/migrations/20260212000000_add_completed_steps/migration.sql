-- AlterTable
ALTER TABLE "Idea" ADD COLUMN "completedSteps" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
