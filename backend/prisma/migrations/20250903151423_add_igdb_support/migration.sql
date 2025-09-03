-- AlterTable
ALTER TABLE "SyncLog" ADD COLUMN     "lastOffset" INTEGER,
ADD COLUMN     "source" TEXT;

-- CreateTable
CREATE TABLE "IgdbGame" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "summary" TEXT,
    "storyline" TEXT,
    "firstReleaseDate" TIMESTAMP(3),
    "releaseYear" INTEGER,
    "coverUrl" TEXT,
    "screenshots" TEXT[],
    "videos" JSONB,
    "artworks" TEXT[],
    "igdbRating" DOUBLE PRECISION,
    "aggregatedRating" DOUBLE PRECISION,
    "ratingCount" INTEGER,
    "aggregatedRatingCount" INTEGER,
    "totalRating" DOUBLE PRECISION,
    "totalRatingCount" INTEGER,
    "category" INTEGER,
    "status" INTEGER,
    "genres" TEXT[],
    "themes" TEXT[],
    "gameModes" TEXT[],
    "playerPerspectives" TEXT[],
    "platforms" TEXT[],
    "keywords" TEXT[],
    "developers" TEXT[],
    "publishers" TEXT[],
    "involvedCompanies" JSONB,
    "similarGames" INTEGER[],
    "parentGame" INTEGER,
    "franchises" INTEGER[],
    "externalGames" JSONB,
    "websites" JSONB,
    "ageRatings" JSONB,
    "multiplayerModes" JSONB,
    "timeToBeat" JSONB,
    "checksum" TEXT,
    "versionTitle" TEXT,
    "lastFetched" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "potentialRawgId" INTEGER,
    "matchConfidence" DOUBLE PRECISION,

    CONSTRAINT "IgdbGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameMatch" (
    "id" SERIAL NOT NULL,
    "rawgId" INTEGER NOT NULL,
    "igdbId" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "matchMethod" TEXT NOT NULL,
    "titleMatch" BOOLEAN NOT NULL,
    "yearMatch" BOOLEAN NOT NULL,
    "platformMatch" BOOLEAN NOT NULL,
    "developerMatch" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "mergedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,

    CONSTRAINT "GameMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IgdbGame_name_idx" ON "IgdbGame"("name");

-- CreateIndex
CREATE INDEX "IgdbGame_slug_idx" ON "IgdbGame"("slug");

-- CreateIndex
CREATE INDEX "IgdbGame_releaseYear_idx" ON "IgdbGame"("releaseYear");

-- CreateIndex
CREATE INDEX "GameMatch_status_idx" ON "GameMatch"("status");

-- CreateIndex
CREATE UNIQUE INDEX "GameMatch_rawgId_igdbId_key" ON "GameMatch"("rawgId", "igdbId");
