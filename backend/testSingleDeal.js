const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  // Fetch one deal from API
  console.log('Fetching deals from CheapShark...');
  const response = await axios.get('https://www.cheapshark.com/api/1.0/deals?pageSize=1');
  const deal = response.data[0];
  
  console.log('Got deal:', deal.title);
  console.log('Deal data:', deal);
  
  // Try to save it
  try {
    const saved = await prisma.cheapSharkDeal.create({
      data: {
        dealId: deal.dealID,
        gameId: deal.gameID,
        title: deal.title,
        storeId: deal.storeID,
        storeName: deal.storeName || 'Unknown',
        salePrice: parseFloat(deal.salePrice),
        normalPrice: parseFloat(deal.normalPrice),
        savings: parseFloat(deal.savings),
        metacriticScore: deal.metacriticScore ? parseInt(deal.metacriticScore) : null,
        steamAppId: deal.steamAppID || null,
        isOnSale: true
      }
    });
    console.log('✅ Saved successfully:', saved.title);
  } catch (error) {
    console.error('❌ Failed to save:', error.message);
    console.error('Full error:', error);
  }
}

test();