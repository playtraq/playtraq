#!/usr/bin/env node
// backend/igdbFullSync.js - Run this to bulk import IGDB games

const igdbSyncService = require('./igdbSyncService');

async function runFullIGDBSync() {
  console.log('🎮 IGDB FULL SYNC LAUNCHER');
  console.log('=====================================');
  console.log(`📅 ${new Date().toLocaleString()}`);
  console.log('');
  
  try {
    // Check current stats
    const stats = await igdbSyncService.getSyncStats();
    
    console.log('📊 Current Status:');
    console.log(`   IGDB games in DB: ${stats.igdbGames}`);
    console.log(`   RAWG games in DB: ${stats.rawgGames}`);
    console.log(`   Last offset: ${stats.lastOffset}`);
    console.log(`   Estimated time: ${stats.estimatedSyncTime}`);
    console.log('');
    
    console.log('⚠️  IMPORTANT NOTES:');
    console.log('   - IGDB allows 4 requests/second');
    console.log('   - We can fetch 500 games per request');
    console.log('   - Total IGDB database: ~250,000 games');
    console.log('   - This will take about 8-10 minutes for full sync');
    console.log('');
    
    // Start the sync
    console.log('🚀 Starting IGDB sync...\n');
    const result = await igdbSyncService.performHistoricalSync();
    
    console.log('\n✅ Sync completed successfully!');
    console.log('Final results:', result);
    
  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  runFullIGDBSync();
}

module.exports = runFullIGDBSync;