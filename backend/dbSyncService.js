const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
require('dotenv').config();

const prisma = new PrismaClient();
const RAWG_API_KEY = process.env.RAWG_API_KEY;
const RAWG_BASE_URL = 'https://api.rawg.io/api';

// Test Prisma connection
prisma.$connect().then(() => {
  console.log('✅ Database connected');
}).catch(err => {
  console.error('❌ Database connection failed:', err);
});

class SmartDbSyncService {
  constructor() {
    this.DAILY_API_LIMIT = 19000;
    this.CALLS_PER_SYNC = 18000; // Use 18,000 calls in one go
    this.GAMES_PER_PAGE = 40; // RAWG max
  }

  // Format and save a game to database
  async saveGame(gameData) {
    try {
      const game = await prisma.game.upsert({
        where: { id: gameData.id },
        update: {
          title: gameData.name,
          slug: gameData.slug,
          description: gameData.description_raw || gameData.description || null,
          released: gameData.released,
          releaseYear: gameData.released ? new Date(gameData.released).getFullYear() : null,
          coverImage: gameData.background_image,
          metacritic: gameData.metacritic,
          rating: gameData.rating,
          ratingCount: gameData.ratings_count,
          playtime: gameData.playtime,
          esrbRating: gameData.esrb_rating?.name || null,
          website: gameData.website,
          genres: gameData.genres?.map(g => g.name) || [],
          platforms: gameData.platforms?.map(p => p.platform.name) || [],
          stores: gameData.stores?.map(s => s.store.name) || [],
          developers: gameData.developers?.map(d => d.name) || [],
          publishers: gameData.publishers?.map(p => p.name) || [],
          screenshots: gameData.short_screenshots?.map(s => s.image) || [],
          tags: gameData.tags?.map(t => t.name) || [],
          lastFetched: new Date()
        },
        create: {
          id: gameData.id,
          title: gameData.name,
          slug: gameData.slug,
          description: gameData.description_raw || gameData.description || null,
          released: gameData.released,
          releaseYear: gameData.released ? new Date(gameData.released).getFullYear() : null,
          coverImage: gameData.background_image,
          metacritic: gameData.metacritic,
          rating: gameData.rating,
          ratingCount: gameData.ratings_count,
          playtime: gameData.playtime,
          esrbRating: gameData.esrb_rating?.name || null,
          website: gameData.website,
          genres: gameData.genres?.map(g => g.name) || [],
          platforms: gameData.platforms?.map(p => p.platform.name) || [],
          stores: gameData.stores?.map(s => s.store.name) || [],
          developers: gameData.developers?.map(d => d.name) || [],
          publishers: gameData.publishers?.map(p => p.name) || [],
          screenshots: gameData.short_screenshots?.map(s => s.image) || [],
          tags: gameData.tags?.map(t => t.name) || []
        }
      });
      return game;
    } catch (error) {
      console.error(`Error saving game ${gameData.name}:`, error.message);
      return null;
    }
  }

  // Get last sync status
  async getLastSync(syncType) {
    return await prisma.syncLog.findFirst({
      where: { 
        syncType,
        status: 'completed'
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // MASTER SYNC: Uses ALL 18,000 API calls to get 720,000 games
  async performHistoricalSync() {
    console.log('🚀 Starting MASSIVE Sync - 18,000 API Calls');
    console.log('Expected: ~720,000 games');
    console.log('=====================================');
    
    // Find the highest page we've ever fetched
    const allSyncs = await prisma.syncLog.findMany({
      where: { syncType: 'historical' },
      orderBy: { lastPage: 'desc' },
      take: 1
    });
    
    const highestPageEverFetched = allSyncs[0]?.lastPage || 0;
    
    // Always start from the next unfetched page
    let startPage = highestPageEverFetched + 1;
    
    console.log(`📊 Highest page ever fetched: ${highestPageEverFetched}`);
    console.log(`📥 Starting from page ${startPage} (first new page)`);
    
    // Create new sync log for this session
    let syncLog = await prisma.syncLog.create({
      data: {
        syncType: 'historical',
        startDate: new Date(),
        status: 'running',
        lastPage: highestPageEverFetched,
        gamesSynced: 0
      }
    });

    // Initialize counters properly
    let sessionGamesProcessed = 0;  // Games saved in THIS run
    let totalGamesProcessed = syncLog.gamesSynced || 0;  // Total games processed across all sessions
    const existingGames = await prisma.game.count();
    console.log(`📊 Starting with ${existingGames.toLocaleString()} games already in database`);
    
    let apiCallsUsed = startPage - 1; // Adjust API calls count based on start page
    let currentPage = startPage;
    let consecutiveErrors = 0;

    while (apiCallsUsed < this.CALLS_PER_SYNC && consecutiveErrors < 5) {
      try {
        console.log(`\n📄 API Call ${apiCallsUsed + 1}/${this.CALLS_PER_SYNC} - Page ${currentPage}`);
        
        // NO FILTERS - Get ALL games
        const response = await axios.get(`${RAWG_BASE_URL}/games`, {
          params: {
            key: RAWG_API_KEY,
            page: currentPage,
            page_size: this.GAMES_PER_PAGE
          }
        });

        apiCallsUsed++;
        consecutiveErrors = 0; // Reset error counter on success
        
        const games = response.data.results;
        
        if (!games || games.length === 0) {
          console.log('No more games available');
          break;
        }
        
        // Save each game
        for (const gameData of games) {
          const saved = await this.saveGame(gameData);
          if (saved) {
            sessionGamesProcessed++;
            totalGamesProcessed++;
            console.log(`  Saved: ${gameData.id} - ${gameData.name}`);
          } else {
            console.log(`  Failed: ${gameData.id} - ${gameData.name}`);
          }
        }

        // Update sync log
        await prisma.syncLog.update({
          where: { id: syncLog.id },
          data: {
            lastPage: currentPage,
            gamesSynced: totalGamesProcessed
          }
        });

        const currentDbTotal = await prisma.game.count();
        console.log(`✅ Saved ${games.length} games. Session: ${sessionGamesProcessed.toLocaleString()} | DB Total: ${currentDbTotal.toLocaleString()} games`);
        
        currentPage++;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        consecutiveErrors++;
        
        if (error.response?.status === 404) {
          console.log(`📋 Page ${currentPage} returned 404 - might be end of available games`);
          currentPage++;
          continue;
        }
        
        console.error(`❌ Error on page ${currentPage}: ${error.message}`);
        
        if (consecutiveErrors >= 5) {
          console.log('Too many consecutive errors, stopping sync');
          break;
        }
        
        currentPage++;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait longer after error
      }
    }

    // Mark sync as complete
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'completed',
        endDate: new Date()
      }
    });

    const finalDbCount = await prisma.game.count();
    console.log('\n=====================================');
    console.log('✅ SYNC COMPLETE!');
    console.log(`📊 Final Statistics:`);
    console.log(`   Session games added: ${sessionGamesProcessed.toLocaleString()}`);
    console.log(`   Total games in database: ${finalDbCount.toLocaleString()}`);
    console.log(`   API calls used: ${apiCallsUsed.toLocaleString()}/${this.CALLS_PER_SYNC.toLocaleString()}`);
    console.log(`   Average games per call: ${apiCallsUsed > 0 ? Math.round(sessionGamesProcessed / apiCallsUsed) : 0}`);
    
    return {
      gamesProcessed: sessionGamesProcessed,
      totalInDb: finalDbCount,
      apiCallsUsed,
      currentPage
    };
  }

  // Refresh/update existing games in database
  async refreshExistingGames(startId = 0, endId = 100000) {
    console.log(`🔄 Refreshing existing games from ID ${startId} to ${endId}`);
    
    const existingGames = await prisma.game.findMany({
      where: {
        id: {
          gte: startId,
          lte: endId
        }
      },
      select: { id: true },
      orderBy: { id: 'asc' }
    });
    
    console.log(`Found ${existingGames.length} games to refresh`);
    
    let updated = 0;
    for (const game of existingGames) {
      try {
        const response = await axios.get(`${RAWG_BASE_URL}/games/${game.id}`, {
          params: { key: RAWG_API_KEY }
        });
        
        await this.saveGame(response.data);
        updated++;
        
        if (updated % 100 === 0) {
          console.log(`Refreshed ${updated}/${existingGames.length} games`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Failed to refresh game ${game.id}: ${error.message}`);
      }
    }
    
    console.log(`✅ Refreshed ${updated} games`);
    return updated;
  }

  // Sync only NEW games (released recently)
  async syncNewReleases() {
    console.log('🆕 Syncing new releases...');
    
    const lastSync = await this.getLastSync('new_releases');
    const lastSyncDate = lastSync?.startDate || new Date('2024-01-01');
    const today = new Date();
    
    const dateRange = `${lastSyncDate.toISOString().split('T')[0]},${today.toISOString().split('T')[0]}`;
    
    const syncLog = await prisma.syncLog.create({
      data: {
        syncType: 'new_releases',
        startDate: today,
        status: 'running'
      }
    });

    let totalSynced = 0;
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 10) {
      try {
        const response = await axios.get(`${RAWG_BASE_URL}/games`, {
          params: {
            key: RAWG_API_KEY,
            dates: dateRange,
            ordering: '-released',
            page: page,
            page_size: this.GAMES_PER_PAGE
          }
        });

        for (const game of response.data.results) {
          await this.saveGame(game);
          totalSynced++;
        }

        hasMore = response.data.next !== null;
        page++;

        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error('Error syncing new releases:', error);
        break;
      }
    }

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'completed',
        endDate: new Date(),
        gamesSynced: totalSynced
      }
    });

    console.log(`✅ Synced ${totalSynced} new releases`);
    return totalSynced;
  }

  // Get current sync statistics
  async getSyncStats() {
    const totalGames = await prisma.game.count();
    const lastHistoricalSync = await this.getLastSync('historical');
    const lastNewReleasesSync = await this.getLastSync('new_releases');
    
    const oldestGame = await prisma.game.findFirst({
      orderBy: { released: 'asc' },
      select: { title: true, released: true }
    });
    
    const newestGame = await prisma.game.findFirst({
      orderBy: { released: 'desc' },
      select: { title: true, released: true }
    });

    const estimatedTotalGames = 850000;
    const percentComplete = ((totalGames / estimatedTotalGames) * 100).toFixed(2);
    const callsNeeded = Math.ceil((estimatedTotalGames - totalGames) / this.GAMES_PER_PAGE);

    return {
      totalGames: totalGames.toLocaleString(),
      percentComplete,
      callsNeeded: callsNeeded.toLocaleString(),
      oldestGame,
      newestGame,
      lastHistoricalSync: lastHistoricalSync?.createdAt,
      lastNewReleasesSync: lastNewReleasesSync?.createdAt
    };
  }

  // Search games locally
  async searchGamesLocal(query, page = 1) {
    const games = await prisma.game.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 20,
      skip: (page - 1) * 20,
      orderBy: { rating: 'desc' }
    });

    const total = await prisma.game.count({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      }
    });

    return {
      results: games,
      total,
      fromCache: true
    };
  }

  // Get games from cache
  async getCachedGames(page = 1, pageSize = 20, filters = {}) {
    const where = {};
    
    if (filters.genre) {
      where.genres = { has: filters.genre };
    }
    
    if (filters.year) {
      where.releaseYear = parseInt(filters.year);
    }
    
    if (filters.platform) {
      where.platforms = { has: filters.platform };
    }

    const games = await prisma.game.findMany({
      where,
      take: pageSize,
      skip: (page - 1) * pageSize,
      orderBy: filters.orderBy || { rating: 'desc' }
    });

    const total = await prisma.game.count({ where });

    return {
      results: games,
      total,
      page,
      pageSize,
      fromCache: true
    };
  }

  // Get a single game
  async getGame(gameId) {
    return await prisma.game.findUnique({
      where: { id: parseInt(gameId) }
    });
  }
}

module.exports = new SmartDbSyncService();