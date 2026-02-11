-- Keep Brain 2.0 Schema Evolution
-- Adds NoteSource, IdeaVersion, IdeaRelation models
-- Adds contentHash, sourceId to Note
-- Adds keepSyncState to User

-- New enums
CREATE TYPE "SourceType" AS ENUM ('GOOGLE_KEEP', 'QUICK_CAPTURE', 'MANUAL', 'NOTION', 'OBSIDIAN');
CREATE TYPE "RelationType" AS ENUM ('RELATED', 'DEPENDS_ON', 'EVOLVED_FROM', 'CONTRADICTS', 'SUPPORTS');

-- Add keepSyncState to User (for delta sync)
ALTER TABLE "User" ADD COLUMN "keepSyncState" TEXT;

-- Create NoteSource table
CREATE TABLE "NoteSource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "name" TEXT NOT NULL,
    "credentials" TEXT,
    "credIv" TEXT,
    "syncState" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'IDLE',
    "syncError" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteSource_pkey" PRIMARY KEY ("id")
);

-- Add sourceId and contentHash to Note
ALTER TABLE "Note" ADD COLUMN "sourceId" TEXT;
ALTER TABLE "Note" ADD COLUMN "contentHash" TEXT;

-- Create IdeaVersion table
CREATE TABLE "IdeaVersion" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "changeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdeaVersion_pkey" PRIMARY KEY ("id")
);

-- Create IdeaRelation table
CREATE TABLE "IdeaRelation" (
    "id" TEXT NOT NULL,
    "fromIdeaId" TEXT NOT NULL,
    "toIdeaId" TEXT NOT NULL,
    "type" "RelationType" NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "aiSuggested" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdeaRelation_pkey" PRIMARY KEY ("id")
);

-- Indexes for NoteSource
CREATE INDEX "NoteSource_userId_idx" ON "NoteSource"("userId");

-- Indexes for Note (new columns)
CREATE INDEX "Note_sourceId_idx" ON "Note"("sourceId");
CREATE INDEX "Note_contentHash_idx" ON "Note"("contentHash");

-- Indexes for IdeaVersion
CREATE INDEX "IdeaVersion_ideaId_idx" ON "IdeaVersion"("ideaId");

-- Indexes for IdeaRelation
CREATE UNIQUE INDEX "IdeaRelation_fromIdeaId_toIdeaId_key" ON "IdeaRelation"("fromIdeaId", "toIdeaId");
CREATE INDEX "IdeaRelation_fromIdeaId_idx" ON "IdeaRelation"("fromIdeaId");
CREATE INDEX "IdeaRelation_toIdeaId_idx" ON "IdeaRelation"("toIdeaId");

-- Foreign keys
ALTER TABLE "NoteSource" ADD CONSTRAINT "NoteSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "NoteSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IdeaVersion" ADD CONSTRAINT "IdeaVersion_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdeaRelation" ADD CONSTRAINT "IdeaRelation_fromIdeaId_fkey" FOREIGN KEY ("fromIdeaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdeaRelation" ADD CONSTRAINT "IdeaRelation_toIdeaId_fkey" FOREIGN KEY ("toIdeaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
