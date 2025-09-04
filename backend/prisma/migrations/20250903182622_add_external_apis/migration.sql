-- CreateTable
CREATE TABLE "SteamApp" (
    "appId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "requiredAge" INTEGER,
    "isFree" BOOLEAN,
    "detailedDescription" TEXT,
    "aboutTheGame" TEXT,
    "shortDescription" TEXT,
    "supportedLanguages" TEXT,
    "headerImage" TEXT,
    "capsuleImage" TEXT,
    "capsuleImageV5" TEXT,
    "website" TEXT,
    "pcRequirements" JSONB,
    "macRequirements" JSONB,
    "linuxRequirements" JSONB,
    "legalNotice" TEXT,
    "developers" TEXT[],
    "publishers" TEXT[],
    "priceOverview" JSONB,
    "packages" INTEGER[],
    "packageGroups" JSONB,
    "platforms" JSONB,
    "metacritic" JSONB,
    "categories" JSONB,
    "genres" JSONB,
    "screenshots" JSONB,
    "movies" JSONB,
    "recommendations" INTEGER,
    "achievements" JSONB,
    "releaseDate" JSONB,
    "supportInfo" JSONB,
    "background" TEXT,
    "backgroundRaw" TEXT,
    "contentDescriptors" JSONB,
    "currentPlayers" INTEGER,
    "peakToday" INTEGER,
    "peakAllTime" INTEGER,
    "peakAllTimeDate" TIMESTAMP(3),
    "reviewScore" INTEGER,
    "reviewScoreDesc" TEXT,
    "totalPositive" INTEGER,
    "totalNegative" INTEGER,
    "totalReviews" INTEGER,
    "hasTradingCards" BOOLEAN,
    "hasMarketplace" BOOLEAN,
    "hasWorkshop" BOOLEAN,
    "workshopItemCount" INTEGER,
    "hasCommunityHub" BOOLEAN,
    "hasLeaderboards" BOOLEAN,
    "hasCloudSaves" BOOLEAN,
    "hasAchievements" BOOLEAN,
    "achievementCount" INTEGER,
    "controllerSupport" TEXT,
    "dlcCount" INTEGER,
    "dlcAppIds" INTEGER[],
    "userTags" JSONB,
    "historicalLow" DOUBLE PRECISION,
    "historicalLowDate" TIMESTAMP(3),
    "lastFullUpdate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "lastQuickUpdate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SteamApp_pkey" PRIMARY KEY ("appId")
);

-- CreateTable
CREATE TABLE "SteamPlayerHistory" (
    "id" SERIAL NOT NULL,
    "appId" INTEGER NOT NULL,
    "playerCount" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SteamPlayerHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheapSharkGame" (
    "gameId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "steamAppId" TEXT,
    "thumb" TEXT,
    "cheapest" DOUBLE PRECISION,
    "cheapestDealId" TEXT,
    "storeIds" TEXT[],
    "historicalLow" DOUBLE PRECISION,
    "historicalLowDate" TIMESTAMP(3),
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheapSharkGame_pkey" PRIMARY KEY ("gameId")
);

-- CreateTable
CREATE TABLE "CheapSharkDeal" (
    "dealId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "storeName" TEXT,
    "salePrice" DOUBLE PRECISION NOT NULL,
    "normalPrice" DOUBLE PRECISION NOT NULL,
    "savings" DOUBLE PRECISION NOT NULL,
    "metacriticScore" INTEGER,
    "metacriticLink" TEXT,
    "steamRatingText" TEXT,
    "steamRatingPercent" INTEGER,
    "steamRatingCount" INTEGER,
    "steamAppId" TEXT,
    "releaseDate" TIMESTAMP(3),
    "lastChange" TIMESTAMP(3),
    "dealRating" DOUBLE PRECISION,
    "thumb" TEXT,
    "isOnSale" BOOLEAN NOT NULL DEFAULT true,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheapSharkDeal_pkey" PRIMARY KEY ("dealId")
);

-- CreateTable
CREATE TABLE "CheapSharkStore" (
    "storeId" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL,
    "images" JSONB,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheapSharkStore_pkey" PRIMARY KEY ("storeId")
);

-- CreateTable
CREATE TABLE "CheapSharkAlert" (
    "id" SERIAL NOT NULL,
    "gameId" TEXT NOT NULL,
    "email" TEXT,
    "targetPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheapSharkAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwitchGame" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "boxArtUrl" TEXT,
    "igdbId" TEXT,
    "currentViewers" INTEGER,
    "currentChannels" INTEGER,
    "peakViewersToday" INTEGER,
    "peakViewersWeek" INTEGER,
    "peakViewersMonth" INTEGER,
    "peakViewersAllTime" INTEGER,
    "avgViewersDay" DOUBLE PRECISION,
    "avgViewersWeek" DOUBLE PRECISION,
    "avgViewersMonth" DOUBLE PRECISION,
    "topStreamers" JSONB,
    "languageBreakdown" JSONB,
    "tags" TEXT[],
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwitchGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwitchViewerHistory" (
    "id" SERIAL NOT NULL,
    "gameId" TEXT NOT NULL,
    "viewers" INTEGER NOT NULL,
    "channels" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwitchViewerHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwitchStream" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "gameName" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userDisplayName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "viewerCount" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "language" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "tags" TEXT[],
    "isMature" BOOLEAN NOT NULL DEFAULT false,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwitchStream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwitchClip" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "broadcasterId" TEXT NOT NULL,
    "broadcasterName" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "creatorName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "thumbnailUrl" TEXT,
    "embedUrl" TEXT,
    "url" TEXT NOT NULL,
    "videoId" TEXT,
    "vodOffset" INTEGER,
    "language" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwitchClip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalApiSync" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "itemsProcessed" INTEGER,
    "itemsAdded" INTEGER,
    "itemsUpdated" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalApiSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SteamApp_name_idx" ON "SteamApp"("name");

-- CreateIndex
CREATE INDEX "SteamApp_currentPlayers_idx" ON "SteamApp"("currentPlayers");

-- CreateIndex
CREATE INDEX "SteamApp_peakAllTime_idx" ON "SteamApp"("peakAllTime");

-- CreateIndex
CREATE INDEX "SteamApp_reviewScore_idx" ON "SteamApp"("reviewScore");

-- CreateIndex
CREATE INDEX "SteamApp_type_idx" ON "SteamApp"("type");

-- CreateIndex
CREATE INDEX "SteamPlayerHistory_appId_timestamp_idx" ON "SteamPlayerHistory"("appId", "timestamp");

-- CreateIndex
CREATE INDEX "CheapSharkGame_title_idx" ON "CheapSharkGame"("title");

-- CreateIndex
CREATE INDEX "CheapSharkGame_steamAppId_idx" ON "CheapSharkGame"("steamAppId");

-- CreateIndex
CREATE INDEX "CheapSharkDeal_gameId_idx" ON "CheapSharkDeal"("gameId");

-- CreateIndex
CREATE INDEX "CheapSharkDeal_storeId_idx" ON "CheapSharkDeal"("storeId");

-- CreateIndex
CREATE INDEX "CheapSharkDeal_savings_idx" ON "CheapSharkDeal"("savings");

-- CreateIndex
CREATE INDEX "CheapSharkDeal_isOnSale_idx" ON "CheapSharkDeal"("isOnSale");

-- CreateIndex
CREATE INDEX "CheapSharkDeal_steamAppId_idx" ON "CheapSharkDeal"("steamAppId");

-- CreateIndex
CREATE INDEX "CheapSharkAlert_gameId_idx" ON "CheapSharkAlert"("gameId");

-- CreateIndex
CREATE INDEX "TwitchGame_name_idx" ON "TwitchGame"("name");

-- CreateIndex
CREATE INDEX "TwitchGame_currentViewers_idx" ON "TwitchGame"("currentViewers");

-- CreateIndex
CREATE INDEX "TwitchGame_igdbId_idx" ON "TwitchGame"("igdbId");

-- CreateIndex
CREATE INDEX "TwitchViewerHistory_gameId_timestamp_idx" ON "TwitchViewerHistory"("gameId", "timestamp");

-- CreateIndex
CREATE INDEX "TwitchStream_gameId_idx" ON "TwitchStream"("gameId");

-- CreateIndex
CREATE INDEX "TwitchStream_viewerCount_idx" ON "TwitchStream"("viewerCount");

-- CreateIndex
CREATE INDEX "TwitchStream_startedAt_idx" ON "TwitchStream"("startedAt");

-- CreateIndex
CREATE INDEX "TwitchClip_gameId_idx" ON "TwitchClip"("gameId");

-- CreateIndex
CREATE INDEX "TwitchClip_viewCount_idx" ON "TwitchClip"("viewCount");

-- CreateIndex
CREATE INDEX "TwitchClip_createdAt_idx" ON "TwitchClip"("createdAt");

-- CreateIndex
CREATE INDEX "ExternalApiSync_service_syncType_idx" ON "ExternalApiSync"("service", "syncType");

-- CreateIndex
CREATE INDEX "ExternalApiSync_createdAt_idx" ON "ExternalApiSync"("createdAt");
