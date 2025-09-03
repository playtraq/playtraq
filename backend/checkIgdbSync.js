#!/usr/bin/env node
// backend/checkIgdbSync.js - Check IGDB sync status

const igdbSyncService = require('./igdbSyncService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkIGDBStatus() {
  console.log('🔍 IGDB Sync Status Check');
  console.log('=====================================\n');
  
  try {
    const stats = await igdbSyncService.getSyncStats();
    
    console.log('📊 Database Status:');
    console.log(`   IGDB games: ${stats.igdbGames}`);
    console.log(`   RAWG games: ${stats.rawgGames}`);
    console.log(`   Total unique games: ${stats.totalUniqueGames}`);
    console.log('');
    
    console.log('📈 IGDB Sync Progress:');
    console.log(`   Progress: ${stats.percentComplete}%`);
    console.log(`   Last offset: ${stats.lastOffset}`);
    console.log(`   Requests remaining: ${stats.requestsNeeded}`);
    console.log(`   Est. time to complete: ${stats.estimatedSyncTime}`);
    console.log('');
    
    // Check for recent syncs
    const recentSyncs = await prisma.syncLog.findMany({
      where: { source: 'igdb' },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    if (recentSyncs.length > 0) {
      console.log('📅 Recent IGDB Syncs:');
      for (const sync of recentSyncs) {
        console.log(`   ${sync.createdAt.toLocaleString()} - ${sync.syncType} - ${sync.status} - ${sync.gamesSynced || 0} games`);
      }
    } else {
      console.log('📅 No IGDB syncs found yet');
    }
    
    // Sample some IGDB games
    const sampleGames = await prisma.igdbGame.findMany({
      orderBy: { lastFetched: 'desc' },
      take: 5
    });
    
    if (sampleGames.length > 0) {
      console.log('\n🎮 Latest IGDB Games Added:');
      for (const game of sampleGames) {
        console.log(`   ${game.name} (${game.releaseYear}) - Rating: ${game.aggregatedRating || 'N/A'}`);
      }
    }
    
  } catch (error) {
    console.error('Error checking status:', error);
  }
  
  await prisma.$disconnect();
  process.exit(0);
}

checkIGDBStatus();