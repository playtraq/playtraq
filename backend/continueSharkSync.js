const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const service = require('./cheapSharkSyncService');

async function continueSync() {
  console.log('🔄 Checking existing data...');
  
  // Check what we already have
  const existingDeals = await prisma.cheapSharkDeal.count();
  const existingGames = await prisma.cheapSharkGame.count();
  console.log(`Already have: ${existingGames} games, ${existingDeals} deals`);
  
  // Get all existing game IDs
  const existingGameIds = await prisma.cheapSharkGame.findMany({
    select: { gameId: true }
  });
  const processedIds = new Set(existingGameIds.map(g => g.gameId));
  
  // Get all unique game IDs from deals
  const dealsWithGames = await prisma.cheapSharkDeal.findMany({
    select: { gameId: true },
    distinct: ['gameId']
  });
  
  const gameIdsFromDeals = dealsWithGames.map(d => d.gameId);
  const unprocessedGames = gameIdsFromDeals.filter(id => !processedIds.has(id));
  
  console.log(`Found ${unprocessedGames.length} games that need processing`);
  
  // Process only the games we don't have
  let processed = 0;
  let saved = 0;
  
  for (const gameId of unprocessedGames) {
    try {
      // Add delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const gameData = await service.getGameById(gameId);
      
      if (gameData) {
        const savedGame = await service.saveGameData({
          ...gameData,
          gameId: gameId
        });
        if (savedGame) saved++;
      }
      
      processed++;
      
      if (processed % 20 === 0) {
        console.log(`Processed ${processed}/${unprocessedGames.length} games`);
      }
    } catch (error) {
      if (error.message && error.message.includes('429')) {
        console.log('Rate limited, waiting 30 seconds...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      } else {
        console.error(`Error processing game ${gameId}:`, error.message);
      }
    }
  }
  
  console.log(`✅ Processed ${processed} games, saved ${saved}`);
  
  // Final counts
  const finalGames = await prisma.cheapSharkGame.count();
  const finalDeals = await prisma.cheapSharkDeal.count();
  console.log(`Total in DB: ${finalGames} games, ${finalDeals} deals`);
}

continueSync().catch(console.error);