// backend/igdbSyncService.js - IGDB Bulk Sync Service

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
require('dotenv').config();

const prisma = new PrismaClient();
const IGDB_CLIENT_ID = process.env.IGDB_CLIENT_ID;
const IGDB_CLIENT_SECRET = process.env.IGDB_CLIENT_SECRET;
const IGDB_BASE_URL = 'https://api.igdb.com/v4';

class IGDBSyncService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.GAMES_PER_REQUEST = 500;  // IGDB allows 500 per request!
    this.DAILY_REQUEST_LIMIT = 4000; // IGDB has 4 requests/second limit
    this.TOTAL_GAMES_ESTIMATE = 250000; // IGDB has ~250k games
  }

  // Get OAuth token from Twitch
  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
        params: {
          client_id: IGDB_CLIENT_ID,
          client_secret: IGDB_CLIENT_SECRET,
          grant_type: 'client_credentials'
        }
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000));
      
      console.log('✅ IGDB access token obtained, expires:', this.tokenExpiry);
      return this.accessToken;
    } catch (error) {
      console.error('❌ Failed to get IGDB access token:', error.message);
      throw error;
    }
  }

  // Format and save a game to SEPARATE IgdbGame table
  async saveGame(gameData) {
    try {
      // Save to completely separate IgdbGame table - NO duplicates in main Game table
      const igdbGame = await prisma.igdbGame.upsert({
        where: { 
          id: gameData.id  // Use IGDB's actual ID, no offset needed
        },
        update: {
          name: gameData.name,
          slug: gameData.slug || this.generateSlug(gameData.name),
          summary: gameData.summary || null,
          storyline: gameData.storyline || null,
          firstReleaseDate: gameData.first_release_date ? 
            new Date(gameData.first_release_date * 1000) : null,
          releaseYear: gameData.first_release_date ? 
            new Date(gameData.first_release_date * 1000).getFullYear() : null,
          coverUrl: gameData.cover?.url ? 
            gameData.cover.url.replace('t_thumb', 't_cover_big').replace('//', 'https://') : null,
          igdbRating: gameData.rating || null,
          aggregatedRating: gameData.aggregated_rating || null,
          ratingCount: gameData.rating_count || 0,
          aggregatedRatingCount: gameData.aggregated_rating_count || 0,
          totalRating: gameData.total_rating || null,
          totalRatingCount: gameData.total_rating_count || 0,
          category: gameData.category || 0,
          status: gameData.status || null,
          genres: gameData.genres?.map(g => g.name) || [],
          themes: gameData.themes?.map(t => t.name) || [],
          gameModes: gameData.game_modes?.map(gm => gm.name) || [],
          playerPerspectives: gameData.player_perspectives?.map(pp => pp.name) || [],
          platforms: gameData.platforms?.map(p => p.name) || [],
          keywords: gameData.keywords?.map(k => k.name) || [],
          developers: gameData.involved_companies
            ?.filter(ic => ic.developer)
            .map(ic => ic.company.name) || [],
          publishers: gameData.involved_companies
            ?.filter(ic => ic.publisher)
            .map(ic => ic.company.name) || [],
          involvedCompanies: gameData.involved_companies || null,
          similarGames: gameData.similar_games || [],
          parentGame: gameData.parent_game || null,
          franchises: gameData.franchises || [],
          externalGames: gameData.external_games || null,
          websites: gameData.websites || null,
          ageRatings: gameData.age_ratings || null,
          multiplayerModes: gameData.multiplayer_modes || null,
          timeToBeat: gameData.time_to_beat || null,
          screenshots: gameData.screenshots?.map(s => 
            s.url.replace('t_thumb', 't_screenshot_big').replace('//', 'https://')
          ) || [],
          artworks: gameData.artworks?.map(a => 
            a.url.replace('t_thumb', 't_1080p').replace('//', 'https://')
          ) || [],
          videos: gameData.videos || null,
          checksum: gameData.checksum || null,
          versionTitle: gameData.version_title || null,
          lastFetched: new Date()
        },
        create: {
          id: gameData.id,  // Use IGDB's actual ID
          name: gameData.name,
          slug: gameData.slug || this.generateSlug(gameData.name),
          summary: gameData.summary || null,
          storyline: gameData.storyline || null,
          firstReleaseDate: gameData.first_release_date ? 
            new Date(gameData.first_release_date * 1000) : null,
          releaseYear: gameData.first_release_date ? 
            new Date(gameData.first_release_date * 1000).getFullYear() : null,
          coverUrl: gameData.cover?.url ? 
            gameData.cover.url.replace('t_thumb', 't_cover_big').replace('//', 'https://') : null,
          igdbRating: gameData.rating || null,
          aggregatedRating: gameData.aggregated_rating || null,
          ratingCount: gameData.rating_count || 0,
          aggregatedRatingCount: gameData.aggregated_rating_count || 0,
          totalRating: gameData.total_rating || null,
          totalRatingCount: gameData.total_rating_count || 0,
          category: gameData.category || 0,
          status: gameData.status || null,
          genres: gameData.genres?.map(g => g.name) || [],
          themes: gameData.themes?.map(t => t.name) || [],
          gameModes: gameData.game_modes?.map(gm => gm.name) || [],
          playerPerspectives: gameData.player_perspectives?.map(pp => pp.name) || [],
          platforms: gameData.platforms?.map(p => p.name) || [],
          keywords: gameData.keywords?.map(k => k.name) || [],
          developers: gameData.involved_companies
            ?.filter(ic => ic.developer)
            .map(ic => ic.company.name) || [],
          publishers: gameData.involved_companies
            ?.filter(ic => ic.publisher)
            .map(ic => ic.company.name) || [],
          involvedCompanies: gameData.involved_companies || null,
          similarGames: gameData.similar_games || [],
          parentGame: gameData.parent_game || null,
          franchises: gameData.franchises || [],
          externalGames: gameData.external_games || null,
          websites: gameData.websites || null,
          ageRatings: gameData.age_ratings || null,
          multiplayerModes: gameData.multiplayer_modes || null,
          timeToBeat: gameData.time_to_beat || null,
          screenshots: gameData.screenshots?.map(s => 
            s.url.replace('t_thumb', 't_screenshot_big').replace('//', 'https://')
          ) || [],
          artworks: gameData.artworks?.map(a => 
            a.url.replace('t_thumb', 't_1080p').replace('//', 'https://')
          ) || [],
          videos: gameData.videos || null,
          checksum: gameData.checksum || null,
          versionTitle: gameData.version_title || null,
          lastFetched: new Date()
        }
      });

      return igdbGame;
    } catch (error) {
      console.error(`Failed to save game ${gameData.name}:`, error.message);
      return null;
    }
  }

  // Generate URL-friendly slug
  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Get last sync status
  async getLastSync(syncType = 'igdb_historical') {
    return await prisma.syncLog.findFirst({
      where: { 
        syncType,
        source: 'igdb'
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Main sync function - pulls ALL games from IGDB
  async performHistoricalSync() {
    console.log('\n🎮 IGDB HISTORICAL SYNC STARTING');
    console.log('=====================================');
    
    const token = await this.getAccessToken();
    
    // Check where we left off
    const allSyncs = await prisma.syncLog.findMany({
      where: { 
        syncType: 'igdb_historical',
        source: 'igdb'
      },
      orderBy: { lastOffset: 'desc' },
      take: 1
    });
    
    const highestOffsetEverFetched = allSyncs[0]?.lastOffset || 0;
    let currentOffset = highestOffsetEverFetched;
    
    console.log(`📊 Starting from offset: ${currentOffset}`);
    console.log(`📈 Estimated total games: ${this.TOTAL_GAMES_ESTIMATE.toLocaleString()}`);
    
    // Create new sync log
    const syncLog = await prisma.syncLog.create({
      data: {
        syncType: 'igdb_historical',
        source: 'igdb',
        startDate: new Date(),
        status: 'running',
        lastOffset: currentOffset
      }
    });

    let sessionGamesProcessed = 0;
    let apiCallsUsed = 0;
    let consecutiveErrors = 0;
    const startTime = Date.now();

    // IGDB sync loop
    while (apiCallsUsed < this.DAILY_REQUEST_LIMIT && consecutiveErrors < 5) {
      try {
        console.log(`\n📄 API Call ${apiCallsUsed + 1}/${this.DAILY_REQUEST_LIMIT} - Offset ${currentOffset}`);
        
        // Build IGDB query - simplified to avoid 400 errors
        const query = `
          fields id, name, slug, summary, storyline, 
                 first_release_date, cover.url, 
                 genres.name, platforms.name, 
                 involved_companies.company.name, 
                 involved_companies.developer,
                 involved_companies.publisher,
                 aggregated_rating, aggregated_rating_count,
                 rating, rating_count,
                 category, status,
                 screenshots.url;
          limit ${this.GAMES_PER_REQUEST};
          offset ${currentOffset};
        `;

        const response = await axios.post(
          `${IGDB_BASE_URL}/games`,
          query,
          {
            headers: {
              'Client-ID': IGDB_CLIENT_ID,
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'text/plain'
            }
          }
        );

        apiCallsUsed++;
        consecutiveErrors = 0;
        
        const games = response.data;
        
        if (!games || games.length === 0) {
          console.log('✅ No more games available - sync complete!');
          break;
        }
        
        console.log(`📦 Received ${games.length} games`);
        
        // Save each game
        for (const gameData of games) {
          const saved = await this.saveGame(gameData);
          if (saved) {
            sessionGamesProcessed++;
            if (sessionGamesProcessed % 100 === 0) {
              console.log(`  ✓ Progress: ${sessionGamesProcessed} games saved`);
            }
          }
        }

        // Update sync log
        await prisma.syncLog.update({
          where: { id: syncLog.id },
          data: {
            lastOffset: currentOffset + games.length,
            gamesSynced: sessionGamesProcessed
          }
        });

        const currentDbTotal = await prisma.igdbGame.count();
        
        console.log(`✅ Batch complete. Session: ${sessionGamesProcessed} | IGDB Total: ${currentDbTotal}`);
        
        currentOffset += this.GAMES_PER_REQUEST;
        
        // Rate limiting - IGDB allows 4 requests per second
        await new Promise(resolve => setTimeout(resolve, 250)); // 250ms = 4 req/sec

      } catch (error) {
        consecutiveErrors++;
        
        if (error.response?.status === 400) {
          console.log(`📋 Offset ${currentOffset} returned 400 - might be end of database`);
          break;
        }
        
        console.error(`❌ Error at offset ${currentOffset}: ${error.message}`);
        
        if (consecutiveErrors >= 5) {
          console.log('Too many consecutive errors, stopping sync');
          break;
        }
        
        // Wait longer after error
        await new Promise(resolve => setTimeout(resolve, 5000));
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

    const finalIgdbCount = await prisma.igdbGame.count();
    const rawgCount = await prisma.game.count();  // Your RAWG games
    const totalUniqueGames = rawgCount + finalIgdbCount;  // Total across both tables
    const elapsedTime = Math.round((Date.now() - startTime) / 1000 / 60);
    
    console.log('\n=====================================');
    console.log('✅ IGDB SYNC COMPLETE!');
    console.log('=====================================');
    console.log(`📊 Final Statistics:`);
    console.log(`   Session games added: ${sessionGamesProcessed.toLocaleString()}`);
    console.log(`   Total IGDB games: ${finalIgdbCount.toLocaleString()}`);
    console.log(`   Total DB games (all sources): ${totalUniqueGames.toLocaleString()}`);
    console.log(`   API calls used: ${apiCallsUsed}/${this.DAILY_REQUEST_LIMIT}`);
    console.log(`   Time elapsed: ${elapsedTime} minutes`);
    console.log(`   Games per minute: ${Math.round(sessionGamesProcessed / elapsedTime)}`);
    
    return {
      gamesProcessed: sessionGamesProcessed,
      totalIgdbGames: finalIgdbCount,
      totalAllGames: totalUniqueGames,
      apiCallsUsed,
      currentOffset
    };
  }

  // Get sync statistics
  async getSyncStats() {
    const igdbGames = await prisma.igdbGame.count();
    const rawgGames = await prisma.game.count();
    
    const lastHistoricalSync = await this.getLastSync('igdb_historical');
    const lastNewReleasesSync = await this.getLastSync('igdb_new_releases');
    
    const percentComplete = ((igdbGames / this.TOTAL_GAMES_ESTIMATE) * 100).toFixed(2);
    const requestsNeeded = Math.ceil((this.TOTAL_GAMES_ESTIMATE - igdbGames) / this.GAMES_PER_REQUEST);
    
    return {
      igdbGames: igdbGames.toLocaleString(),
      rawgGames: rawgGames.toLocaleString(),
      totalUniqueGames: (rawgGames + igdbGames).toLocaleString(),
      percentComplete,
      requestsNeeded: requestsNeeded.toLocaleString(),
      estimatedSyncTime: `${Math.round(requestsNeeded / 4 / 60)} minutes`,
      lastHistoricalSync: lastHistoricalSync?.createdAt,
      lastNewReleasesSync: lastNewReleasesSync?.createdAt,
      lastOffset: lastHistoricalSync?.lastOffset || 0
    };
  }

  // Search games locally from IGDB cache
  async searchGamesLocal(query, page = 1) {
    const games = await prisma.igdbGame.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { summary: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 20,
      skip: (page - 1) * 20,
      orderBy: { aggregatedRating: 'desc' }
    });

    const total = await prisma.igdbGame.count({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { summary: { contains: query, mode: 'insensitive' } }
        ]
      }
    });

    return {
      results: games,
      total,
      source: 'igdb_cache'
    };
  }

  // Sync only NEW releases from IGDB
  async syncNewReleases() {
    console.log('🆕 Syncing new IGDB releases...');
    
    const token = await this.getAccessToken();
    const today = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = today - (30 * 24 * 60 * 60);
    
    const syncLog = await prisma.syncLog.create({
      data: {
        syncType: 'igdb_new_releases',
        source: 'igdb',
        startDate: new Date(),
        status: 'running'
      }
    });

    let totalSynced = 0;
    let offset = 0;
    let hasMore = true;

    while (hasMore && offset < 2000) { // Max 2000 new games
      try {
        const query = `
          fields id, name, slug, summary, first_release_date, cover.url, 
                 genres.name, platforms.name, 
                 involved_companies.company.name, 
                 involved_companies.developer,
                 involved_companies.publisher,
                 aggregated_rating, aggregated_rating_count;
          where first_release_date > ${thirtyDaysAgo} & first_release_date < ${today};
          sort first_release_date desc;
          limit 500;
          offset ${offset};
        `;

        const response = await axios.post(
          `${IGDB_BASE_URL}/games`,
          query,
          {
            headers: {
              'Client-ID': IGDB_CLIENT_ID,
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'text/plain'
            }
          }
        );

        const games = response.data;
        
        if (games.length === 0) {
          hasMore = false;
          break;
        }

        for (const game of games) {
          await this.saveGame(game);
          totalSynced++;
        }

        offset += 500;
        await new Promise(resolve => setTimeout(resolve, 250));
        
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

    console.log(`✅ Synced ${totalSynced} new IGDB releases`);
    return totalSynced;
  }
}

module.exports = new IGDBSyncService();