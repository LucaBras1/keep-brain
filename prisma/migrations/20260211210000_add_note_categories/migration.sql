-- CreateEnum
CREATE TYPE "NoteCategory" AS ENUM ('SOCIAL_MEDIA', 'VIDEO', 'LINK', 'POETRY', 'LYRICS', 'WRITING', 'SHOPPING', 'TODO', 'REFERENCE', 'JOURNAL');

-- AlterEnum
ALTER TYPE "ProcessingStatus" ADD VALUE 'CATEGORIZED';

-- AlterTable
ALTER TABLE "Note" ADD COLUMN "noteCategory" "NoteCategory",
ADD COLUMN "generatedTitle" TEXT,
ADD COLUMN "summary" TEXT;

-- CreateIndex
CREATE INDEX "Note_noteCategory_idx" ON "Note"("noteCategory");
