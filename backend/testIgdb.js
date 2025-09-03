// testIgdb.js - Test IGDB connection
const axios = require('axios');
require('dotenv').config();

const IGDB_CLIENT_ID = process.env.IGDB_CLIENT_ID;
const IGDB_CLIENT_SECRET = process.env.IGDB_CLIENT_SECRET;

async function testIGDB() {
  console.log('Testing IGDB connection...');
  console.log('Client ID:', IGDB_CLIENT_ID);
  console.log('Client Secret:', IGDB_CLIENT_SECRET ? '***hidden***' : 'NOT SET');
  
  try {
    // Get token
    console.log('\n1. Getting access token...');
    const tokenResponse = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        client_id: IGDB_CLIENT_ID,
        client_secret: IGDB_CLIENT_SECRET,
        grant_type: 'client_credentials'
      }
    });
    
    const token = tokenResponse.data.access_token;
    console.log('✅ Token obtained!');
    
    // Test simple query
    console.log('\n2. Testing simple game query...');
    const query = `fields id, name; limit 5;`;
    
    const response = await axios.post(
      'https://api.igdb.com/v4/games',
      query,
      {
        headers: {
          'Client-ID': IGDB_CLIENT_ID,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/plain',
          'Accept': 'application/json'
        }
      }
    );
    
    console.log('✅ Query successful!');
    console.log('Games found:', response.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.error('Authentication failed - check your IGDB credentials');
    }
  }
}

testIGDB();