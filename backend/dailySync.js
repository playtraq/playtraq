#!/usr/bin/env node

const dbSyncService = require('./dbSyncService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runDailySync() {
  console.log('🤖 PlayTraq Automated Daily Sync');
  console.log(`📅 ${new Date().toLocaleString()}`);
  console.log('=====================================\n');
  
  try {
    // Get current stats
    const stats = await dbSyncService.getSyncStats();
    
    console.log('📊 Current Database Status:');
    console.log(`   Total games: ${stats.totalGames.toLocaleString()}`);
    console.log(`   Coverage: ${stats.percentComplete}% of RAWG database`);
    console.log(`   Days to full sync: ${stats.daysToComplete}`);
    console.log(`   Oldest game: ${stats.oldestGame?.title} (${stats.oldestGame?.released})`);
    console.log(`   Newest game: ${stats.newestGame?.title} (${stats.newestGame?.released})`);
    console.log('');

    // Check what type of sync to run
    const today = new Date().getDay();
    
    if (today === 0) {
      // Sunday: Sync new releases
      console.log('🆕 Sunday - Syncing new releases...\n');
      const newGames = await dbSyncService.syncNewReleases();
      console.log(`✅ Added ${newGames} new releases\n`);
      
    } else {
      // Other days: Continue historical sync
      console.log('📚 Continuing historical sync...\n');
      const result = await dbSyncService.performHistoricalSync();
      
      if (!result.hasMorePages) {
        console.log('🎉 HISTORICAL SYNC COMPLETE! All games downloaded!');
        
        // Switch to maintenance mode
        console.log('🔄 Switching to maintenance mode - checking for updates...');
        await dbSyncService.syncNewReleases();
      }
    }

    // Final stats
    const finalStats = await dbSyncService.getSyncStats();
    console.log('\n📊 Final Statistics:');
    console.log(`   Total games now: ${finalStats.totalGames.toLocaleString()}`);
    console.log(`   Estimated completion: ${finalStats.estimatedCompletion.toLocaleDateString()}`);
    
    // Log success
    console.log('\n✅ Daily sync completed successfully!');
    
  } catch (error) {
    console.error('❌ Daily sync failed:', error);
    
    // Log error to database
    await prisma.syncLog.create({
      data: {
        syncType: 'daily_error',
        startDate: new Date(),
        endDate: new Date(),
        status: 'failed',
        error: error.message
      }
    });
  } finally {
    await prisma.$disconnect();
  }
}

// Calculate next run time (for cron jobs)
function getNextRunTime() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(3, 0, 0, 0); // Run at 3 AM
  return tomorrow;
}

// Run the sync
if (require.main === module) {
  runDailySync().then(() => {
    console.log(`\n⏰ Next sync scheduled for: ${getNextRunTime().toLocaleString()}`);
    process.exit(0);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runDailySync };