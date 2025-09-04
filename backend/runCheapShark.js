const cheapSharkService = require('./cheapSharkSyncService');

async function run() {
  console.log('🚀 Starting CheapShark Full Sync...');
  try {
    const result = await cheapSharkService.performFullSync();
    console.log('✅ Complete!', result);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

run();
