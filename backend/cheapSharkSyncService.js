// cheapSharkSyncService.js
// Complete CheapShark data synchronization service
// Pulls ALL available data from CheapShark APIs

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class CheapSharkSyncService {
  constructor() {
    this.API_BASE = 'https://www.cheapshark.com/api/1.0';
    this.requestDelay = 100; // CheapShark is generous with rate limits
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

  // Get ALL stores with complete info
  async getAllStores() {
    try {
      console.log('📥 Fetching all stores from CheapShark...');
      const response = await axios.get(`${this.API_BASE}/stores`);
      
      const stores = response.data;
      console.log(`Found ${stores.length} stores`);

      // Save each store with ALL data
      for (const store of stores) {
        await prisma.cheapSharkStore.upsert({
          where: { storeId: store.storeID },
          update: {
            storeName: store.storeName,
            isActive: store.isActive === 1,
            images: {
              banner: store.images?.banner,
              logo: store.images?.logo,
              icon: store.images?.icon
            },
            lastUpdated: new Date()
          },
          create: {
            storeId: store.storeID,
            storeName: store.storeName,
            isActive: store.isActive === 1,
            images: {
              banner: store.images?.banner,
              logo: store.images?.logo,
              icon: store.images?.icon
            }
          }
        });
      }

      return stores;
    } catch (error) {
      console.error('Error fetching stores:', error.message);
      return [];
    }
  }

  // Get complete game info including all deals
  async getGameById(gameId) {
    await this.rateLimit();
    
    try {
      const response = await axios.get(`${this.API_BASE}/games`, {
        params: { id: gameId }
      });

      const data = response.data;
      
      // This returns COMPLETE game info with ALL deals across stores
      return {
        gameId: gameId,
        info: data.info,
        cheapestPriceEver: data.cheapestPriceEver,
        deals: data.deals, // ALL deals for this game
        bundles: data.bundles // Bundle history if available
      };
    } catch (error) {
      console.error(`Error fetching game ${gameId}:`, error.message);
      return null;
    }
  }

  // Get games by title with all metadata
  async searchGamesByTitle(title, exact = false) {
    await this.rateLimit();
    
    try {
      const response = await axios.get(`${this.API_BASE}/games`, {
        params: {
          title: title,
          limit: 60, // Max allowed
          exact: exact ? 1 : 0
        }
      });

      return response.data;
    } catch (error) {
      console.error(`Error searching for ${title}:`, error.message);
      return [];
    }
  }

  // Get ALL deals with comprehensive filters
  async getAllDeals(params = {}) {
    await this.rateLimit();
    
    try {
      const defaultParams = {
        pageSize: 60, // Max allowed per page
        ...params
      };

      const response = await axios.get(`${this.API_BASE}/deals`, {
        params: defaultParams
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching deals:', error.message);
      return [];
    }
  }

  // Get deal lookup (specific deal info)
  async getDealInfo(dealId) {
    await this.rateLimit();
    
    try {
      const response = await axios.get(`${this.API_BASE}/deals`, {
        params: { id: dealId }
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching deal ${dealId}:`, error.message);
      return null;
    }
  }

  // Get multiple games info at once
  async getMultipleGames(gameIds) {
    await this.rateLimit();
    
    try {
      const response = await axios.get(`${this.API_BASE}/games`, {
        params: {
          ids: gameIds.join(','),
          format: 'array'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching multiple games:', error.message);
      return [];
    }
  }

  // Save complete game data
  async saveGameData(gameData) {
    try {
      // Save or update the main game record
      const game = await prisma.cheapSharkGame.upsert({
        where: { gameId: gameData.gameId },
        update: {
          title: gameData.info?.title || gameData.title,
          steamAppId: gameData.info?.steamAppID || gameData.steamAppId,
          thumb: gameData.info?.thumb || gameData.thumb,
          cheapest: gameData.cheapestPriceEver?.price ? 
            parseFloat(gameData.cheapestPriceEver.price) : null,
          cheapestDealId: gameData.cheapestPriceEver?.dealID,
          historicalLow: gameData.cheapestPriceEver?.price ? 
            parseFloat(gameData.cheapestPriceEver.price) : null,
          historicalLowDate: gameData.cheapestPriceEver?.date ? 
            new Date(parseInt(gameData.cheapestPriceEver.date) * 1000) : null,
          storeIds: gameData.deals ? 
            [...new Set(gameData.deals.map(d => d.storeID))] : [],
          lastUpdated: new Date()
        },
        create: {
          gameId: gameData.gameId,
          title: gameData.info?.title || gameData.title,
          steamAppId: gameData.info?.steamAppID || gameData.steamAppId,
          thumb: gameData.info?.thumb || gameData.thumb,
          cheapest: gameData.cheapestPriceEver?.price ? 
            parseFloat(gameData.cheapestPriceEver.price) : null,
          cheapestDealId: gameData.cheapestPriceEver?.dealID,
          historicalLow: gameData.cheapestPriceEver?.price ? 
            parseFloat(gameData.cheapestPriceEver.price) : null,
          historicalLowDate: gameData.cheapestPriceEver?.date ? 
            new Date(parseInt(gameData.cheapestPriceEver.date) * 1000) : null,
          storeIds: gameData.deals ? 
            [...new Set(gameData.deals.map(d => d.storeID))] : []
        }
      });

      // Save ALL deals for this game
      if (gameData.deals && gameData.deals.length > 0) {
        for (const deal of gameData.deals) {
          await this.saveDeal(deal, gameData.gameId, gameData.info?.title);
        }
      }

      return game;
    } catch (error) {
      console.error(`Error saving game ${gameData.gameId}:`, error.message);
      return null;
    }
  }

  // Convert isOnSale string to boolean
  parseIsOnSale(value) {
    if (value === '1' || value === 1 || value === true) return true;
    if (value === '0' || value === 0 || value === false) return false;
    return false; // Default to false if undefined or unexpected value
  }

  // Save individual deal with ALL metadata
  async saveDeal(dealData, gameId = null, gameTitle = null) {
    try {
      // Generate a unique dealId if not provided
      const dealId = dealData.dealID || 
        `${dealData.storeID}_${dealData.gameID || gameId}_${dealData.price}`;

      const deal = await prisma.cheapSharkDeal.upsert({
        where: { dealId: dealId },
        update: {
          gameId: dealData.gameID || gameId,
          title: dealData.title || gameTitle,
          storeId: dealData.storeID,
          storeName: dealData.storeName,
          salePrice: parseFloat(dealData.salePrice || dealData.price || 0),
          normalPrice: parseFloat(dealData.normalPrice || dealData.retailPrice || 0),
          savings: dealData.savings ? parseFloat(dealData.savings) : 
            this.calculateSavings(dealData.salePrice || dealData.price, 
                                 dealData.normalPrice || dealData.retailPrice),
          metacriticScore: dealData.metacriticScore ? parseInt(dealData.metacriticScore) : null,
          metacriticLink: dealData.metacriticLink,
          steamRatingText: dealData.steamRatingText,
          steamRatingPercent: dealData.steamRatingPercent ? 
            parseInt(dealData.steamRatingPercent) : null,
          steamRatingCount: dealData.steamRatingCount ? 
            parseInt(dealData.steamRatingCount) : null,
          steamAppId: dealData.steamAppID,
          releaseDate: dealData.releaseDate ? 
            new Date(parseInt(dealData.releaseDate) * 1000) : null,
          lastChange: dealData.lastChange ? 
            new Date(parseInt(dealData.lastChange) * 1000) : null,
          dealRating: dealData.dealRating ? parseFloat(dealData.dealRating) : null,
          thumb: dealData.thumb,
          isOnSale: this.parseIsOnSale(dealData.isOnSale),
          lastUpdated: new Date()
        },
        create: {
          dealId: dealId,
          gameId: dealData.gameID || gameId || 'unknown',
          title: dealData.title || gameTitle || 'Unknown',
          storeId: dealData.storeID,
          storeName: dealData.storeName,
          salePrice: parseFloat(dealData.salePrice || dealData.price || 0),
          normalPrice: parseFloat(dealData.normalPrice || dealData.retailPrice || 0),
          savings: dealData.savings ? parseFloat(dealData.savings) : 
            this.calculateSavings(dealData.salePrice || dealData.price, 
                                 dealData.normalPrice || dealData.retailPrice),
          metacriticScore: dealData.metacriticScore ? parseInt(dealData.metacriticScore) : null,
          metacriticLink: dealData.metacriticLink,
          steamRatingText: dealData.steamRatingText,
          steamRatingPercent: dealData.steamRatingPercent ? 
            parseInt(dealData.steamRatingPercent) : null,
          steamRatingCount: dealData.steamRatingCount ? 
            parseInt(dealData.steamRatingCount) : null,
          steamAppId: dealData.steamAppID,
          releaseDate: dealData.releaseDate ? 
            new Date(parseInt(dealData.releaseDate) * 1000) : null,
          lastChange: dealData.lastChange ? 
            new Date(parseInt(dealData.lastChange) * 1000) : null,
          dealRating: dealData.dealRating ? parseFloat(dealData.dealRating) : null,
          thumb: dealData.thumb,
          isOnSale: this.parseIsOnSale(dealData.isOnSale)
        }
      });

      return deal;
    } catch (error) {
      console.error('Error saving deal:', error.message);
      return null;
    }
  }

  // Calculate savings percentage
  calculateSavings(salePrice, normalPrice) {
    if (!normalPrice || normalPrice === 0) return 0;
    const sale = parseFloat(salePrice || 0);
    const normal = parseFloat(normalPrice);
    return Math.round(((normal - sale) / normal) * 100);
  }

  // Main sync function - get ALL CheapShark data
  async performFullSync() {
    const syncLog = await prisma.externalApiSync.create({
      data: {
        service: 'cheapshark',
        syncType: 'full',
        startDate: new Date()
      }
    });

    try {
      console.log('💰 STARTING FULL CHEAPSHARK SYNC');
      console.log('==================================');
      console.log('This will fetch ALL games and deals from CheapShark');
      
      // Step 1: Update all stores
      await this.getAllStores();

      // Step 2: Get ALL deals (paginated)
      let pageNumber = 0;
      let totalDeals = 0;
      let savedDeals = 0;
      let hasMore = true;
      const uniqueGameIds = new Set();

      console.log('\n📥 Fetching all deals page by page...');
      
      while (hasMore) {
        const deals = await this.getAllDeals({
          pageNumber: pageNumber,
          pageSize: 60,
          sortBy: 'Deal Rating'
        });

        if (!deals || deals.length === 0) {
          hasMore = false;
          break;
        }

        // Process each deal
        for (const deal of deals) {
          if (deal.gameID) {
            uniqueGameIds.add(deal.gameID);
          }
          
          const saved = await this.saveDeal(deal);
          if (saved) savedDeals++;
          totalDeals++;
        }

        console.log(`Page ${pageNumber}: ${deals.length} deals (Total: ${totalDeals}, Unique games: ${uniqueGameIds.size})`);
        
        pageNumber++;
        
        // Safety limit
        if (pageNumber > 2000) {
          console.log('Reached page limit for safety');
          break;
        }

        await this.rateLimit();
      }

      // Step 3: Get complete data for each unique game
      console.log(`\n📊 Fetching complete data for ${uniqueGameIds.size} games...`);
      const gameIds = Array.from(uniqueGameIds);
      let gamesProcessed = 0;
      let gamesSaved = 0;

      for (const gameId of gameIds) {
        try {
          const gameData = await this.getGameById(gameId);
          
          if (gameData) {
            const saved = await this.saveGameData({
              ...gameData,
              gameId: gameId
            });
            if (saved) gamesSaved++;
          }
          
          gamesProcessed++;
          
          if (gamesProcessed % 100 === 0) {
            console.log(`Processed ${gamesProcessed}/${gameIds.length} games`);
          }
        } catch (error) {
          console.error(`Error processing game ${gameId}:`, error.message);
        }
      }

      // Step 4: Get historical deals (different sort)
      console.log('\n📈 Fetching historical best deals...');
      let historicalPages = 0;
      
      while (historicalPages < 50) {
        const historicalDeals = await this.getAllDeals({
          pageNumber: historicalPages,
          pageSize: 60,
          sortBy: 'Savings',
          desc: 1
        });

        if (!historicalDeals || historicalDeals.length === 0) break;

        for (const deal of historicalDeals) {
          await this.saveDeal(deal);
        }

        historicalPages++;
      }

      // Update sync log
      await prisma.externalApiSync.update({
        where: { id: syncLog.id },
        data: {
          endDate: new Date(),
          itemsProcessed: totalDeals,
          itemsAdded: savedDeals,
          success: true,
          metadata: {
            totalDeals: totalDeals,
            savedDeals: savedDeals,
            uniqueGames: uniqueGameIds.size,
            gamesSaved: gamesSaved,
            pagesProcessed: pageNumber
          }
        }
      });

      console.log('\n==================================');
      console.log('✅ CHEAPSHARK SYNC COMPLETE!');
      console.log(`Total deals processed: ${totalDeals.toLocaleString()}`);
      console.log(`Unique games found: ${uniqueGameIds.size.toLocaleString()}`);
      console.log(`Games saved: ${gamesSaved}`);
      console.log(`Pages processed: ${pageNumber}`);
      
      return { 
        deals: totalDeals, 
        games: uniqueGameIds.size,
        saved: gamesSaved 
      };

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

  // Update current hot deals
  async updateHotDeals() {
    console.log('🔥 Updating hot deals...');
    
    const syncLog = await prisma.externalApiSync.create({
      data: {
        service: 'cheapshark',
        syncType: 'update',
        startDate: new Date()
      }
    });

    try {
      let updated = 0;
      
      // Get various types of hot deals
      const dealTypes = [
        { sortBy: 'Savings', desc: 1, onSale: 1, AAA: 1 },
        { sortBy: 'Deal Rating', desc: 1, metacritic: 70 },
        { sortBy: 'Recent', steamRating: 75 },
        { sortBy: 'Price', upperPrice: 5 },
        { sortBy: 'Metacritic', lowerPrice: 0, onSale: 1 }
      ];

      for (const params of dealTypes) {
        const deals = await this.getAllDeals({
          ...params,
          pageSize: 60,
          pageNumber: 0
        });

        for (const deal of deals) {
          const saved = await this.saveDeal(deal);
          if (saved) updated++;
        }

        await this.rateLimit();
      }

      await prisma.externalApiSync.update({
        where: { id: syncLog.id },
        data: {
          endDate: new Date(),
          itemsUpdated: updated,
          success: true
        }
      });

      console.log(`✅ Updated ${updated} deals`);
      return updated;
      
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

  // Search and sync specific games
  async searchAndSync(searchTerm) {
    console.log(`🔍 Searching for "${searchTerm}"...`);
    
    const games = await this.searchGamesByTitle(searchTerm);
    console.log(`Found ${games.length} games`);
    
    let synced = 0;
    for (const game of games) {
      // Get full game data
      const fullData = await this.getGameById(game.gameID);
      if (fullData) {
        await this.saveGameData({
          ...fullData,
          gameId: game.gameID
        });
        synced++;
      }
    }
    
    console.log(`✅ Synced ${synced} games`);
    return synced;
  }

  // Get statistics
  async getStats() {
    const stats = {
      totalGames: await prisma.cheapSharkGame.count(),
      totalDeals: await prisma.cheapSharkDeal.count(),
      activeDeals: await prisma.cheapSharkDeal.count({ 
        where: { isOnSale: true } 
      }),
      stores: await prisma.cheapSharkStore.count(),
      avgSavings: await prisma.cheapSharkDeal.aggregate({
        _avg: { savings: true },
        where: { isOnSale: true }
      }),
      topSavings: await prisma.cheapSharkDeal.findMany({
        where: { isOnSale: true },
        orderBy: { savings: 'desc' },
        take: 10,
        select: {
          title: true,
          savings: true,
          salePrice: true,
          normalPrice: true,
          storeName: true
        }
      })
    };

    return stats;
  }
}

module.exports = new CheapSharkSyncService();