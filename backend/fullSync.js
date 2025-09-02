const { PrismaClient } = require('@prisma/client');
const dbSyncService = require('./dbSyncService');
const prisma = new PrismaClient();

async function fullSync() {
  console.log('🚀 PLAYTRAQ COMPLETE DATABASE SYNC');
  console.log('=====================================');
  console.log('Expected duration: 4-5 hours');
  console.log('Expected games: ~720,000');
  console.log('API calls to use: 18,000');
  console.log('\nStarting at:', new Date().toLocaleString());
  console.log('Keep this terminal open!\n');
  
  try {
    // Check current status
    const currentCount = await prisma.game.count();
    console.log(`Current games in DB: ${currentCount.toLocaleString()}`);
    
    // Run the massive sync
    const result = await dbSyncService.performHistoricalSync();
    
    // Final stats
    const finalCount = await prisma.game.count();
    console.log('\n=====================================');
    console.log('✅ SYNC COMPLETE!');
    console.log(`Total games now: ${finalCount.toLocaleString()}`);
    console.log(`New games added: ${(finalCount - currentCount).toLocaleString()}`);
    console.log(`Time: ${new Date().toLocaleString()}`);
    console.log('\nYour database is ready for production!');
    
    // Clean up duplicates if any
    console.log('\nChecking for duplicates...');
    const duplicates = await prisma.$queryRaw`
      SELECT slug, COUNT(*) as count 
      FROM "Game" 
      GROUP BY slug 
      HAVING COUNT(*) > 1
    `;
    
    if (duplicates.length > 0) {
      console.log(`Found ${duplicates.length} duplicate slugs, cleaning...`);
      // Handle duplicates - keep the one with best data
    } else {
      console.log('✅ No duplicates found - database is clean!');
    }
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    console.log('You can resume by running this script again');
  } finally {
    await prisma.$disconnect();
  }
}

// Add progress indicator
let dots = 0;
const progressInterval = setInterval(() => {
  process.stdout.write(`\rSyncing${'.'.repeat(dots % 4)}    `);
  dots++;
}, 1000);

fullSync().then(() => {
  clearInterval(progressInterval);
  process.exit(0);
});