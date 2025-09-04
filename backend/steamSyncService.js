// steamSyncService.js
// Complete Steam data synchronization service
// Pulls ALL available data from Steam APIs

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class SteamSyncService {
  constructor() {
    this.STEAM_API_KEY = process.env.STEAM_API_KEY;
    this.STEAM_API_BASE = 'https://api.steampowered.com';
    this.STEAM_STORE_API = 'https://store.steampowered.com/api';
    this.STEAMSPY_API = 'https://steamspy.com/api.php';
    
    // Rate limiting
    this.requestDelay = 200; // 200ms between requests
    this.lastRequestTime = 0;
  }

  async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.requestDelay) {
      await new Promise(resolve => setTimeout(resolve, this.requestDelay - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }

  // Get ALL apps from Steam (games, DLC, software, etc.)
  async getAllSteamApps() {
    try {
      console.log('📥 Fetching all Steam apps list...');
      const response = await axios.get(`${this.STEAM_API_BASE}/ISteamApps/GetAppList/v2/`);
      
      // Returns array of {appid, name}
      const apps = response.data.applist.apps;
      console.log(`Found ${apps.length.toLocaleString()} total Steam apps`);
      
      return apps;
    } catch (error) {
      console.error('Error fetching Steam apps list:', error.message);
      return [];
    }
  }

  // Get complete details for a single app with retry logic
  async getAppDetails(appId, retryCount = 0) {
    await this.rateLimit();
    
    // Maximum 3 retries
    if (retryCount > 3) {
      console.log(`Skipping app ${appId} after 3 retries`);
      return null;
    }
    
    try {
      const response = await axios.get(`${this.STEAM_STORE_API}/appdetails`, {
        params: { appids: appId },
        timeout: 10000 // 10 second timeout
      });

      const data = response.data[appId];
      if (!data || !data.success) return null;

      const details = data.data;
      
      // Extract ALL available fields
      return {
        appId: appId,
        name: details.name,
        type: details.type,
        requiredAge: details.required_age,
        isFree: details.is_free,
        detailedDescription: details.detailed_description,
        aboutTheGame: details.about_the_game,
        shortDescription: details.short_description,
        supportedLanguages: details.supported_languages,
        headerImage: details.header_image,
        capsuleImage: details.capsule_image,
        capsuleImageV5: details.capsule_imagev5,
        website: details.website,
        pcRequirements: details.pc_requirements,
        macRequirements: details.mac_requirements,
        linuxRequirements: details.linux_requirements,
        legalNotice: details.legal_notice,
        developers: details.developers || [],
        publishers: details.publishers || [],
        priceOverview: details.price_overview,
        packages: details.packages || [],
        packageGroups: details.package_groups,
        platforms: details.platforms,
        metacritic: details.metacritic,
        categories: details.categories,
        genres: details.genres,
        screenshots: details.screenshots,
        movies: details.movies,
        recommendations: details.recommendations?.total,
        achievements: details.achievements,
        releaseDate: details.release_date,
        supportInfo: details.support_info,
        background: details.background,
        backgroundRaw: details.background_raw,
        contentDescriptors: details.content_descriptors,
        reviewScore: details.review_score,
        reviewScoreDesc: details.review_score_desc,
        controllerSupport: details.controller_support,
        dlcAppIds: details.dlc || [],
        dlcCount: details.dlc?.length || 0,
        userTags: details.tags
      };
    } catch (error) {
      if (error.response?.status === 429) {
        const waitTime = 30 + (retryCount * 30); // Increase wait time with each retry
        console.log(`Rate limited on app ${appId}, waiting ${waitTime} seconds... (retry ${retryCount + 1}/3)`);
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
        return this.getAppDetails(appId, retryCount + 1); // Retry with incremented count
      }
      
      if (error.code === 'ECONNABORTED') {
        console.log(`Timeout on app ${appId}, retrying... (${retryCount + 1}/3)`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        return this.getAppDetails(appId, retryCount + 1);
      }
      
      // For other errors, just return null
      return null;
    }
  }

  // Get current player count
  async getPlayerCount(appId) {
    await this.rateLimit();
    
    try {
      const response = await axios.get(
        `${this.STEAM_API_BASE}/ISteamUserStats/GetNumberOfCurrentPlayers/v1/`,
        { 
          params: { appid: appId },
          timeout: 5000
        }
      );
      
      return response.data.response.player_count || 0;
    } catch (error) {
      return null;
    }
  }

  // Get review data from Steam Reviews API
  async getReviewData(appId) {
    await this.rateLimit();
    
    try {
      const response = await axios.get(
        `${this.STEAM_STORE_API}/appreviews/${appId}`,
        { 
          params: {
            json: 1,
            language: 'all',
            purchase_type: 'all',
            num_per_page: 0 // Just get summary
          },
          timeout: 5000
        }
      );

      const data = response.data.query_summary;
      return {
        totalPositive: data.total_positive,
        totalNegative: data.total_negative,
        totalReviews: data.total_reviews,
        reviewScore: data.review_score,
        reviewScoreDesc: data.review_score_desc
      };
    } catch (error) {
      return null;
    }
  }

  // Save app to database
  async saveAppToDb(appData, playerCount = null, reviewData = null) {
    try {
      const savedApp = await prisma.steamApp.upsert({
        where: { appId: appData.appId },
        update: {
          name: appData.name,
          type: appData.type,
          requiredAge: appData.requiredAge,
          isFree: appData.isFree,
          detailedDescription: appData.detailedDescription,
          aboutTheGame: appData.aboutTheGame,
          shortDescription: appData.shortDescription,
          supportedLanguages: appData.supportedLanguages,
          headerImage: appData.headerImage,
          capsuleImage: appData.capsuleImage,
          capsuleImageV5: appData.capsuleImageV5,
          website: appData.website,
          pcRequirements: appData.pcRequirements,
          macRequirements: appData.macRequirements,
          linuxRequirements: appData.linuxRequirements,
          legalNotice: appData.legalNotice,
          developers: appData.developers,
          publishers: appData.publishers,
          priceOverview: appData.priceOverview,
          packages: appData.packages,
          packageGroups: appData.packageGroups,
          platforms: appData.platforms,
          metacritic: appData.metacritic,
          categories: appData.categories,
          genres: appData.genres,
          screenshots: appData.screenshots,
          movies: appData.movies,
          recommendations: appData.recommendations,
          achievements: appData.achievements,
          releaseDate: appData.releaseDate,
          supportInfo: appData.supportInfo,
          background: appData.background,
          backgroundRaw: appData.backgroundRaw,
          contentDescriptors: appData.contentDescriptors,
          currentPlayers: playerCount,
          reviewScore: reviewData?.reviewScore || appData.reviewScore,
          reviewScoreDesc: reviewData?.reviewScoreDesc || appData.reviewScoreDesc,
          totalPositive: reviewData?.totalPositive,
          totalNegative: reviewData?.totalNegative,
          totalReviews: reviewData?.totalReviews,
          controllerSupport: appData.controllerSupport,
          dlcAppIds: appData.dlcAppIds,
          dlcCount: appData.dlcCount,
          userTags: appData.userTags,
          lastFullUpdate: new Date()
        },
        create: {
          appId: appData.appId,
          name: appData.name,
          type: appData.type || 'unknown',
          requiredAge: appData.requiredAge,
          isFree: appData.isFree,
          detailedDescription: appData.detailedDescription,
          aboutTheGame: appData.aboutTheGame,
          shortDescription: appData.shortDescription,
          supportedLanguages: appData.supportedLanguages,
          headerImage: appData.headerImage,
          capsuleImage: appData.capsuleImage,
          capsuleImageV5: appData.capsuleImageV5,
          website: appData.website,
          pcRequirements: appData.pcRequirements,
          macRequirements: appData.macRequirements,
          linuxRequirements: appData.linuxRequirements,
          legalNotice: appData.legalNotice,
          developers: appData.developers,
          publishers: appData.publishers,
          priceOverview: appData.priceOverview,
          packages: appData.packages,
          packageGroups: appData.packageGroups,
          platforms: appData.platforms,
          metacritic: appData.metacritic,
          categories: appData.categories,
          genres: appData.genres,
          screenshots: appData.screenshots,
          movies: appData.movies,
          recommendations: appData.recommendations,
          achievements: appData.achievements,
          releaseDate: appData.releaseDate,
          supportInfo: appData.supportInfo,
          background: appData.background,
          backgroundRaw: appData.backgroundRaw,
          contentDescriptors: appData.contentDescriptors,
          currentPlayers: playerCount,
          reviewScore: reviewData?.reviewScore || appData.reviewScore,
          reviewScoreDesc: reviewData?.reviewScoreDesc || appData.reviewScoreDesc,
          totalPositive: reviewData?.totalPositive,
          totalNegative: reviewData?.totalNegative,
          totalReviews: reviewData?.totalReviews,
          controllerSupport: appData.controllerSupport,
          dlcAppIds: appData.dlcAppIds,
          dlcCount: appData.dlcCount,
          userTags: appData.userTags
        }
      });

      // Save player count history if available
      if (playerCount !== null && playerCount > 0) {
        await prisma.steamPlayerHistory.create({
          data: {
            appId: appData.appId,
            playerCount: playerCount
          }
        });
      }

      return savedApp;
    } catch (error) {
      console.error(`Error saving Steam app ${appData.appId}:`, error.message);
      return null;
    }
  }

  // Main sync function - get ALL Steam data
  async performFullSync() {
    const syncLog = await prisma.externalApiSync.create({
      data: {
        service: 'steam',
        syncType: 'full',
        startDate: new Date()
      }
    });

    try {
      console.log('🎮 STARTING FULL STEAM SYNC');
      console.log('============================');
      
      // Step 1: Get all apps
      const allApps = await this.getAllSteamApps();
      
      // Check what we already have
      const existingApps = await prisma.steamApp.findMany({
        select: { appId: true }
      });
      const existingIds = new Set(existingApps.map(a => a.appId));
      
      console.log(`Already have ${existingIds.size} apps in database`);
      console.log('Processing new apps and games...');
      
      let processed = 0;
      let saved = 0;
      let errors = 0;
      let skipped = 0;

      // Process in batches
      const batchSize = 100;
      for (let i = 0; i < allApps.length; i += batchSize) {
        const batch = allApps.slice(i, i + batchSize);
        
        for (const app of batch) {
          try {
            // Skip if we already have this app
            if (existingIds.has(app.appid)) {
              skipped++;
              processed++;
              continue;
            }
            
            // Get full details
            const details = await this.getAppDetails(app.appid);
            
            if (details && details.type === 'game') {
              // Get additional data for games
              const [playerCount, reviewData] = await Promise.all([
                this.getPlayerCount(app.appid),
                this.getReviewData(app.appid)
              ]);

              // Save to database
              const savedApp = await this.saveAppToDb(details, playerCount, reviewData);
              if (savedApp) saved++;
            } else if (details) {
              // Save non-games too but without player/review data
              const savedApp = await this.saveAppToDb(details);
              if (savedApp) saved++;
            }
            
            processed++;
            
            if (processed % 100 === 0) {
              console.log(`Processed: ${processed.toLocaleString()} / ${allApps.length.toLocaleString()} (${saved} saved, ${skipped} skipped, ${errors} errors)`);
            }
          } catch (error) {
            errors++;
            console.error(`Error processing app ${app.appid}:`, error.message);
          }
        }

        // Longer delay between batches to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Update sync log
      await prisma.externalApiSync.update({
        where: { id: syncLog.id },
        data: {
          endDate: new Date(),
          itemsProcessed: processed,
          itemsAdded: saved,
          success: true,
          metadata: {
            totalApps: allApps.length,
            saved: saved,
            skipped: skipped,
            errors: errors
          }
        }
      });

      console.log('============================');
      console.log(`✅ Steam sync complete!`);
      console.log(`Total processed: ${processed.toLocaleString()}`);
      console.log(`Saved: ${saved.toLocaleString()}`);
      console.log(`Skipped (already had): ${skipped.toLocaleString()}`);
      console.log(`Errors: ${errors}`);
      
      return { saved, processed, errors, skipped };

    } catch (error) {
      await prisma.externalApiSync.update({
        where: { id: syncLog.id },
        data: {
          endDate: new Date(),
          success: false,
          error: error.message
        }
      });
      
      throw error;
    }
  }

  // Continue sync from where it left off
  async continueSync() {
    console.log('📊 Checking existing progress...');
    
    const existingCount = await prisma.steamApp.count();
    console.log(`Already have ${existingCount} apps in database`);
    
    const allApps = await this.getAllSteamApps();
    
    // Get list of existing app IDs
    const existingApps = await prisma.steamApp.findMany({
      select: { appId: true }
    });
    const existingIds = new Set(existingApps.map(a => a.appId));
    
    // Filter to only apps we don't have
    const remainingApps = allApps.filter(app => !existingIds.has(app.appid));
    console.log(`${remainingApps.length} apps remaining to process`);
    
    if (remainingApps.length === 0) {
      console.log('✅ All apps already processed!');
      return { saved: 0, processed: 0 };
    }
    
    // Process remaining apps
    let processed = 0;
    let saved = 0;
    
    for (const app of remainingApps) {
      try {
        const details = await this.getAppDetails(app.appid);
        
        if (details && details.type === 'game') {
          const [playerCount, reviewData] = await Promise.all([
            this.getPlayerCount(app.appid),
            this.getReviewData(app.appid)
          ]);
          
          const savedApp = await this.saveAppToDb(details, playerCount, reviewData);
          if (savedApp) saved++;
        } else if (details) {
          const savedApp = await this.saveAppToDb(details);
          if (savedApp) saved++;
        }
        
        processed++;
        
        if (processed % 50 === 0) {
          console.log(`Progress: ${processed}/${remainingApps.length} (${saved} saved)`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.error(`Error with app ${app.appid}:`, error.message);
      }
    }
    
    console.log(`✅ Continue sync complete! Processed ${processed}, saved ${saved}`);
    return { saved, processed };
  }

  // Update player counts for existing games
  async updatePlayerCounts() {
    console.log('📊 Updating Steam player counts...');
    
    const games = await prisma.steamApp.findMany({
      where: { type: 'game' },
      orderBy: { lastQuickUpdate: 'asc' },
      take: 500
    });

    let updated = 0;
    for (const game of games) {
      const playerCount = await this.getPlayerCount(game.appId);
      
      if (playerCount !== null && playerCount > 0) {
        await prisma.steamApp.update({
          where: { appId: game.appId },
          data: {
            currentPlayers: playerCount,
            lastQuickUpdate: new Date()
          }
        });

        await prisma.steamPlayerHistory.create({
          data: {
            appId: game.appId,
            playerCount: playerCount
          }
        });

        updated++;
      }

      await this.rateLimit();
    }

    console.log(`✅ Updated ${updated} player counts`);
    return updated;
  }

  // Get top games by current players
  async getTopGamesByPlayers(limit = 100) {
    const games = await prisma.steamApp.findMany({
      where: {
        type: 'game',
        currentPlayers: { gt: 0 }
      },
      orderBy: { currentPlayers: 'desc' },
      take: limit
    });

    return games;
  }

  // Search games by name
  async searchGames(query) {
    const games = await prisma.steamApp.findMany({
      where: {
        AND: [
          { type: 'game' },
          { name: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 50
    });

    return games;
  }

  // Get sync statistics
  async getSyncStats() {
    const stats = {
      totalApps: await prisma.steamApp.count(),
      games: await prisma.steamApp.count({ where: { type: 'game' } }),
      dlc: await prisma.steamApp.count({ where: { type: 'dlc' } }),
      withPlayers: await prisma.steamApp.count({ 
        where: { currentPlayers: { gt: 0 } } 
      }),
      lastSync: await prisma.externalApiSync.findFirst({
        where: { service: 'steam' },
        orderBy: { createdAt: 'desc' }
      })
    };
    
    return stats;
  }
}

module.exports = new SteamSyncService();