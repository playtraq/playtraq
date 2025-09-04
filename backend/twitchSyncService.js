// twitchSyncService.js
// Complete Twitch data synchronization service
// Pulls ALL available data from Twitch APIs

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class TwitchSyncService {
  constructor() {
    this.CLIENT_ID = process.env.TWITCH_CLIENT_ID;
    this.CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
    this.API_BASE = 'https://api.twitch.tv/helix';
    this.accessToken = null;
    this.tokenExpiry = null;
    
    // Rate limiting
    this.requestDelay = 100; // 100ms between requests
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

  // Get OAuth token with auto-refresh
  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      console.log('🔑 Getting new Twitch access token...');
      const response = await axios.post(
        'https://id.twitch.tv/oauth2/token',
        null,
        {
          params: {
            client_id: this.CLIENT_ID,
            client_secret: this.CLIENT_SECRET,
            grant_type: 'client_credentials'
          }
        }
      );

      this.accessToken = response.data.access_token;
      // Set expiry with 5 minute buffer
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 300) * 1000);
      console.log('✅ Token obtained, expires at:', this.tokenExpiry.toLocaleString());
      
      return this.accessToken;
    } catch (error) {
      console.error('Error getting Twitch token:', error.message);
      return null;
    }
  }

  // Make authenticated request with rate limiting
  async makeRequest(endpoint, params = {}) {
    await this.rateLimit();
    
    const token = await this.getAccessToken();
    if (!token) throw new Error('Failed to get Twitch access token');

    try {
      const response = await axios.get(`${this.API_BASE}${endpoint}`, {
        headers: {
          'Client-Id': this.CLIENT_ID,
          'Authorization': `Bearer ${token}`
        },
        params
      });

      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        // Token expired, retry with new token
        console.log('Token expired, refreshing...');
        this.accessToken = null;
        return this.makeRequest(endpoint, params);
      }
      
      if (error.response?.status === 429) {
        // Rate limited
        const retryAfter = error.response.headers['retry-after'] || 60;
        console.log(`Rate limited, waiting ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return this.makeRequest(endpoint, params);
      }
      
      throw error;
    }
  }

  // Get ALL games (paginated through everything)
  async getAllGames() {
    const allGames = [];
    let cursor = null;
    let pageCount = 0;

    console.log('📥 Fetching ALL games from Twitch...');
    console.log('This will get as many as Twitch allows...');

    while (true) {
      try {
        const params = { first: 100 }; // Max per request
        if (cursor) params.after = cursor;

        const data = await this.makeRequest('/games/top', params);
        
        if (!data.data || data.data.length === 0) {
          break;
        }

        allGames.push(...data.data);
        pageCount++;
        
        console.log(`Page ${pageCount}: Fetched ${data.data.length} games (Total: ${allGames.length})`);

        // Twitch has a limit on pagination depth
        // We can typically get around 1000-2000 games
        if (!data.pagination?.cursor || pageCount >= 100) {
          console.log('Reached Twitch pagination limit or max pages');
          break;
        }

        cursor = data.pagination.cursor;
      } catch (error) {
        console.error('Error fetching games page:', error.message);
        break;
      }
    }

    console.log(`✅ Retrieved ${allGames.length} total games from Twitch`);
    return allGames;
  }

  // Get ALL streams for a specific game
  async getAllStreamsForGame(gameId, maxStreams = 1000) {
    const allStreams = [];
    let cursor = null;
    let pageCount = 0;

    while (allStreams.length < maxStreams) {
      const params = {
        game_id: gameId,
        first: 100 // Max per request
      };
      if (cursor) params.after = cursor;

      try {
        const data = await this.makeRequest('/streams', params);
        
        if (!data.data || data.data.length === 0) {
          break;
        }

        allStreams.push(...data.data);
        pageCount++;

        if (!data.pagination?.cursor || pageCount >= 10) {
          break;
        }

        cursor = data.pagination.cursor;
      } catch (error) {
        console.error(`Error fetching streams for game ${gameId}:`, error.message);
        break;
      }
    }

    return allStreams.slice(0, maxStreams);
  }

  // Get ALL clips for a game (last 7 days)
  async getAllClipsForGame(gameId, days = 7) {
    const allClips = [];
    let cursor = null;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    while (allClips.length < 1000) { // Twitch limits clips
      const params = {
        game_id: gameId,
        first: 100,
        started_at: startDate.toISOString(),
        ended_at: endDate.toISOString()
      };
      if (cursor) params.after = cursor;

      try {
        const data = await this.makeRequest('/clips', params);
        
        if (!data.data || data.data.length === 0) {
          break;
        }

        allClips.push(...data.data);

        if (!data.pagination?.cursor) {
          break;
        }

        cursor = data.pagination.cursor;
      } catch (error) {
        console.error(`Error fetching clips for game ${gameId}:`, error.message);
        break;
      }
    }

    return allClips;
  }

  // Get game details by ID
  async getGameById(gameId) {
    try {
      const data = await this.makeRequest('/games', { id: gameId });
      return data.data[0] || null;
    } catch (error) {
      console.error(`Error fetching game ${gameId}:`, error.message);
      return null;
    }
  }

  // Get game details by name
  async getGameByName(name) {
    try {
      const data = await this.makeRequest('/games', { name: name });
      return data.data[0] || null;
    } catch (error) {
      console.error(`Error fetching game ${name}:`, error.message);
      return null;
    }
  }

  // Get videos for a game
  async getVideosForGame(gameId, first = 100) {
    try {
      const data = await this.makeRequest('/videos', {
        game_id: gameId,
        first: first,
        sort: 'views',
        type: 'all'
      });
      return data.data || [];
    } catch (error) {
      console.error(`Error fetching videos for game ${gameId}:`, error.message);
      return [];
    }
  }

  // Save complete game data with all metrics
  async saveGameData(gameData, streams = [], clips = [], videos = []) {
    try {
      // Calculate comprehensive metrics
      const totalViewers = streams.reduce((sum, s) => sum + s.viewer_count, 0);
      const totalChannels = streams.length;
      
      // Language breakdown with viewer counts
      const langBreakdown = {};
      streams.forEach(stream => {
        if (!langBreakdown[stream.language]) {
          langBreakdown[stream.language] = {
            viewers: 0,
            channels: 0
          };
        }
        langBreakdown[stream.language].viewers += stream.viewer_count;
        langBreakdown[stream.language].channels += 1;
      });

      // Top streamers with complete info
      const topStreamers = streams
        .sort((a, b) => b.viewer_count - a.viewer_count)
        .slice(0, 20)
        .map(s => ({
          userId: s.user_id,
          userName: s.user_login,
          displayName: s.user_name,
          viewers: s.viewer_count,
          title: s.title,
          language: s.language,
          startedAt: s.started_at,
          thumbnailUrl: s.thumbnail_url,
          tags: s.tags || []
        }));

      // Tags from all streams
      const allTags = new Set();
      streams.forEach(s => {
        if (s.tags) s.tags.forEach(tag => allTags.add(tag));
      });

      // Save main game record
      const game = await prisma.twitchGame.upsert({
        where: { id: gameData.id },
        update: {
          name: gameData.name,
          boxArtUrl: gameData.box_art_url?.replace('{width}x{height}', '285x380'),
          igdbId: gameData.igdb_id,
          currentViewers: totalViewers,
          currentChannels: totalChannels,
          languageBreakdown: langBreakdown,
          topStreamers: topStreamers,
          tags: Array.from(allTags),
          lastUpdated: new Date()
        },
        create: {
          id: gameData.id,
          name: gameData.name,
          boxArtUrl: gameData.box_art_url?.replace('{width}x{height}', '285x380'),
          igdbId: gameData.igdb_id,
          currentViewers: totalViewers,
          currentChannels: totalChannels,
          languageBreakdown: langBreakdown,
          topStreamers: topStreamers,
          tags: Array.from(allTags)
        }
      });

      // Save viewer history
      if (totalViewers > 0) {
        await prisma.twitchViewerHistory.create({
          data: {
            gameId: gameData.id,
            viewers: totalViewers,
            channels: totalChannels
          }
        });
      }

      // Save ALL streams (not just top)
      for (const stream of streams) {
        try {
          await prisma.twitchStream.upsert({
            where: { id: stream.id },
            update: {
              viewerCount: stream.viewer_count,
              title: stream.title,
              thumbnailUrl: stream.thumbnail_url,
              tags: stream.tags || [],
              capturedAt: new Date()
            },
            create: {
              id: stream.id,
              gameId: gameData.id,
              gameName: stream.game_name,
              userId: stream.user_id,
              userName: stream.user_login,
              userDisplayName: stream.user_name,
              title: stream.title,
              viewerCount: stream.viewer_count,
              startedAt: new Date(stream.started_at),
              language: stream.language,
              thumbnailUrl: stream.thumbnail_url,
              tags: stream.tags || [],
              isMature: stream.is_mature || false
            }
          });
        } catch (error) {
          // Individual stream save errors shouldn't stop the whole process
          console.error(`Error saving stream ${stream.id}:`, error.message);
        }
      }

      // Save ALL clips
      for (const clip of clips) {
        try {
          await prisma.twitchClip.upsert({
            where: { id: clip.id },
            update: {
              viewCount: clip.view_count,
              capturedAt: new Date()
            },
            create: {
              id: clip.id,
              gameId: gameData.id,
              broadcasterId: clip.broadcaster_id,
              broadcasterName: clip.broadcaster_name,
              creatorId: clip.creator_id,
              creatorName: clip.creator_name,
              title: clip.title,
              viewCount: clip.view_count,
              createdAt: new Date(clip.created_at),
              duration: clip.duration,
              thumbnailUrl: clip.thumbnail_url,
              embedUrl: clip.embed_url,
              url: clip.url,
              videoId: clip.video_id || null,
              vodOffset: clip.vod_offset || null,
              language: clip.language
            }
          });
        } catch (error) {
          console.error(`Error saving clip ${clip.id}:`, error.message);
        }
      }

      return game;
    } catch (error) {
      console.error(`Error saving game ${gameData.name}:`, error.message);
      return null;
    }
  }

  // Calculate and update peak statistics
  async calculatePeaksForGame(gameId) {
    try {
      // Get historical data for different time periods
      const now = new Date();
      const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

      // Today's data
      const todayHistory = await prisma.twitchViewerHistory.findMany({
        where: {
          gameId: gameId,
          timestamp: { gte: oneDayAgo }
        },
        orderBy: { viewers: 'desc' }
      });

      // Week's data
      const weekHistory = await prisma.twitchViewerHistory.findMany({
        where: {
          gameId: gameId,
          timestamp: { gte: oneWeekAgo }
        },
        orderBy: { viewers: 'desc' }
      });

      // Month's data
      const monthHistory = await prisma.twitchViewerHistory.findMany({
        where: {
          gameId: gameId,
          timestamp: { gte: oneMonthAgo }
        },
        orderBy: { viewers: 'desc' }
      });

      // All time data
      const allTimeHistory = await prisma.twitchViewerHistory.findMany({
        where: { gameId: gameId },
        orderBy: { viewers: 'desc' },
        take: 1
      });

      // Calculate peaks and averages
      const peakToday = todayHistory[0]?.viewers || 0;
      const peakWeek = weekHistory[0]?.viewers || 0;
      const peakMonth = monthHistory[0]?.viewers || 0;
      const peakAllTime = allTimeHistory[0]?.viewers || 0;

      const avgDay = todayHistory.length > 0 ?
        todayHistory.reduce((sum, h) => sum + h.viewers, 0) / todayHistory.length : 0;
      const avgWeek = weekHistory.length > 0 ?
        weekHistory.reduce((sum, h) => sum + h.viewers, 0) / weekHistory.length : 0;
      const avgMonth = monthHistory.length > 0 ?
        monthHistory.reduce((sum, h) => sum + h.viewers, 0) / monthHistory.length : 0;

      // Update game record
      await prisma.twitchGame.update({
        where: { id: gameId },
        data: {
          peakViewersToday: Math.round(peakToday),
          peakViewersWeek: Math.round(peakWeek),
          peakViewersMonth: Math.round(peakMonth),
          peakViewersAllTime: Math.round(peakAllTime),
          avgViewersDay: Math.round(avgDay),
          avgViewersWeek: Math.round(avgWeek),
          avgViewersMonth: Math.round(avgMonth)
        }
      });

      return true;
    } catch (error) {
      console.error(`Error calculating peaks for game ${gameId}:`, error.message);
      return false;
    }
  }

  // Main sync function - get ALL Twitch data
  async performFullSync() {
    const syncLog = await prisma.externalApiSync.create({
      data: {
        service: 'twitch',
        syncType: 'full',
        startDate: new Date()
      }
    });

    try {
      console.log('🎮 STARTING FULL TWITCH SYNC');
      console.log('==============================');
      console.log('This will fetch ALL available data from Twitch');
      
      // Step 1: Get all games
      const allGames = await this.getAllGames();
      console.log(`\n📊 Processing ${allGames.length} games...`);

      let processed = 0;
      let saved = 0;
      let totalStreams = 0;
      let totalClips = 0;

      // Process each game
      for (const game of allGames) {
        try {
          console.log(`\nProcessing: ${game.name}`);
          
          // Get ALL streams for this game (up to 1000)
          const streams = await this.getAllStreamsForGame(game.id, 1000);
          console.log(`  - ${streams.length} active streams`);
          totalStreams += streams.length;

          // Get clips from last 7 days
          const clips = await this.getAllClipsForGame(game.id, 7);
          console.log(`  - ${clips.length} recent clips`);
          totalClips += clips.length;

          // Get top videos
          const videos = await this.getVideosForGame(game.id, 20);
          console.log(`  - ${videos.length} videos`);

          // Save all data
          const savedGame = await this.saveGameData(game, streams, clips, videos);
          if (savedGame) {
            saved++;
            
            // Calculate peak statistics
            await this.calculatePeaksForGame(game.id);
          }

          processed++;
          
          if (processed % 10 === 0) {
            console.log(`\n📈 Progress: ${processed}/${allGames.length} games processed`);
          }

          // Rate limiting
          await this.rateLimit();
        } catch (error) {
          console.error(`Error processing game ${game.name}:`, error.message);
        }
      }

      // Update all peak calculations
      console.log('\n📊 Calculating final statistics...');
      for (const game of allGames) {
        await this.calculatePeaksForGame(game.id);
      }

      // Update sync log
      await prisma.externalApiSync.update({
        where: { id: syncLog.id },
        data: {
          endDate: new Date(),
          itemsProcessed: processed,
          itemsAdded: saved,
          success: true,
          metadata: {
            gamesFound: allGames.length,
            gamesSaved: saved,
            totalStreams: totalStreams,
            totalClips: totalClips
          }
        }
      });

      console.log('\n==============================');
      console.log('✅ TWITCH SYNC COMPLETE!');
      console.log(`Games processed: ${processed}`);
      console.log(`Games saved: ${saved}`);
      console.log(`Total streams captured: ${totalStreams.toLocaleString()}`);
      console.log(`Total clips captured: ${totalClips.toLocaleString()}`);
      
      return { 
        processed, 
        saved, 
        totalStreams, 
        totalClips 
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

  // Update current streaming data (run frequently)
  async updateCurrentData() {
    console.log('🔄 Updating current Twitch data...');
    
    const syncLog = await prisma.externalApiSync.create({
      data: {
        service: 'twitch',
        syncType: 'update',
        startDate: new Date()
      }
    });

    try {
      // Get top 100 games by current viewership
      const params = { first: 100 };
      const data = await this.makeRequest('/games/top', params);
      
      let updated = 0;
      
      for (const game of data.data) {
        // Get current streams
        const streams = await this.getAllStreamsForGame(game.id, 100);
        
        // Get recent clips (last 24 hours)
        const clips = await this.getAllClipsForGame(game.id, 1);
        
        // Save updated data
        const saved = await this.saveGameData(game, streams, clips);
        if (saved) {
          updated++;
          await this.calculatePeaksForGame(game.id);
        }
      }

      await prisma.externalApiSync.update({
        where: { id: syncLog.id },
        data: {
          endDate: new Date(),
          itemsUpdated: updated,
          success: true
        }
      });

      console.log(`✅ Updated ${updated} games`);
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

  // Get statistics
  async getStats() {
    const stats = {
      totalGames: await prisma.twitchGame.count(),
      gamesWithViewers: await prisma.twitchGame.count({
        where: { currentViewers: { gt: 0 } }
      }),
      totalStreams: await prisma.twitchStream.count(),
      totalClips: await prisma.twitchClip.count(),
      viewerHistory: await prisma.twitchViewerHistory.count(),
      topGames: await prisma.twitchGame.findMany({
        orderBy: { currentViewers: 'desc' },
        take: 10,
        select: {
          name: true,
          currentViewers: true,
          currentChannels: true,
          peakViewersAllTime: true
        }
      }),
      topClips: await prisma.twitchClip.findMany({
        orderBy: { viewCount: 'desc' },
        take: 5,
        select: {
          title: true,
          viewCount: true,
          creatorName: true,
          url: true
        }
      })
    };

    return stats;
  }
}

module.exports = new TwitchSyncService();