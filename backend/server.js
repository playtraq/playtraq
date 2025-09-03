const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const gameService = require('./gameService');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to PlayTraq API!' });
});

// Get games from cache with enhanced filtering
app.get('/api/games', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 40,
      mood,
      gameLength,
      platform,
      genre,
      search
    } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    // Build where clause for Prisma
    const where = {};
    
    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Platform filter
    if (platform) {
      where.platforms = {
        has: platform
      };
    }
    
    // Genre filter (also handles mood through genre mapping)
    if (genre || mood) {
      let targetGenres = [];
      
      if (genre) {
        targetGenres.push(genre);
      }
      
      if (mood) {
        // Map moods to genres
        const moodToGenres = {
          'Relaxing & Chill': ['Simulation', 'Puzzle', 'Casual', 'Family'],
          'Intense Action': ['Action', 'Shooter', 'Fighting'],
          'Brain Teaser': ['Puzzle', 'Strategy', 'Card', 'Board Games'],
          'Social & Multiplayer': ['Massively Multiplayer', 'Sports', 'Racing'],
          'Story-Driven': ['Adventure', 'RPG', 'Visual Novel'],
          'Competitive': ['Sports', 'Racing', 'Fighting', 'MOBA'],
          'Creative & Building': ['Simulation', 'Indie', 'Sandbox'],
          'Dark & Atmospheric': ['Horror', 'Adventure', 'Thriller']
        };
        
        if (moodToGenres[mood]) {
          targetGenres.push(...moodToGenres[mood]);
        }
      }
      
      if (targetGenres.length > 0) {
        where.genres = {
          hasSome: targetGenres
        };
      }
    }
    
    // Game length filter based on playtime
    if (gameLength) {
      switch(gameLength) {
        case 'Quick (< 2 hours)':
          where.playtime = { lt: 2 };
          break;
        case 'Short (2-10 hours)':
          where.playtime = { gte: 2, lt: 10 };
          break;
        case 'Medium (10-30 hours)':
          where.playtime = { gte: 10, lt: 30 };
          break;
        case 'Long (30-60 hours)':
          where.playtime = { gte: 30, lt: 60 };
          break;
        case 'Epic (60+ hours)':
          where.playtime = { gte: 60 };
          break;
      }
    }
    
    // Get filtered games from database
    const games = await prisma.game.findMany({
      where,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { rating: 'desc' }
    });
    
    const totalGames = await prisma.game.count({ where });
    
    res.json({
      results: games,
      total: totalGames,
      page: pageNum,
      hasMore: totalGames > pageNum * limitNum,
      fromCache: true
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// Get all unique platforms from your database
app.get('/api/platforms', async (req, res) => {
  try {
    // Get a sample of games to extract platforms
    const games = await prisma.game.findMany({
      select: { platforms: true },
      take: 5000 // Sample size
    });
    
    // Extract unique platforms
    const platformSet = new Set();
    games.forEach(game => {
      if (game.platforms && Array.isArray(game.platforms)) {
        game.platforms.forEach(platform => {
          if (platform) platformSet.add(platform);
        });
      }
    });
    
    const platforms = Array.from(platformSet).sort();
    res.json({ platforms });
  } catch (error) {
    console.error('Error fetching platforms:', error);
    res.status(500).json({ 
      error: 'Failed to fetch platforms',
      platforms: ['PC', 'PlayStation 5', 'Xbox Series S/X', 'Nintendo Switch'] // Fallback
    });
  }
});

// Get all unique genres from your database
app.get('/api/genres', async (req, res) => {
  try {
    // Get a sample of games to extract genres
    const games = await prisma.game.findMany({
      select: { genres: true },
      take: 5000 // Sample size
    });
    
    // Extract unique genres
    const genreSet = new Set();
    games.forEach(game => {
      if (game.genres && Array.isArray(game.genres)) {
        game.genres.forEach(genre => {
          if (genre) genreSet.add(genre);
        });
      }
    });
    
    const genres = Array.from(genreSet).sort();
    res.json({ genres });
  } catch (error) {
    console.error('Error fetching genres:', error);
    res.status(500).json({ 
      error: 'Failed to fetch genres',
      genres: ['Action', 'Adventure', 'RPG', 'Strategy', 'Simulation'] // Fallback
    });
  }
});

// Search games
app.get('/api/games/search', async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ results: [], total: 0 });
    }
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    // Search in both name and title fields
    const games = await prisma.game.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { title: { contains: q, mode: 'insensitive' } }
        ]
      },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: [
        { rating: 'desc' },
        { ratingsCount: 'desc' }
      ]
    });
    
    const total = await prisma.game.count({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { title: { contains: q, mode: 'insensitive' } }
        ]
      }
    });
    
    res.json({
      results: games,
      total,
      page: pageNum,
      hasMore: total > pageNum * limitNum
    });
  } catch (error) {
    console.error('Error searching games:', error);
    res.status(500).json({ error: 'Failed to search games' });
  }
});

// Get new releases
app.get('/api/games/new-releases', async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const games = await gameService.getNewReleases(page);
    res.json(games);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch new releases' });
  }
});

// Get upcoming games
app.get('/api/games/upcoming', async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const games = await gameService.getUpcomingGames(page);
    res.json(games);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming games' });
  }
});

// Get game details from RAWG
app.get('/api/games/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const game = await gameService.getGameDetails(id);
    res.json(game);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch game details' });
  }
});

// Get similar games
app.get('/api/games/:id/similar', async (req, res) => {
  try {
    const { id } = req.params;
    const similar = await gameService.getSimilarGames(id);
    res.json(similar);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch similar games' });
  }
});

// Add a review
app.post('/api/reviews', async (req, res) => {
  try {
    const { rating, content, userId, gameId } = req.body;
    const review = await prisma.review.create({
      data: {
        rating,
        content,
        userId,
        gameId
      },
      include: {
        user: {
          select: { username: true }
        },
        game: {
          select: { title: true }
        }
      }
    });
    res.json(review);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// AI Recommendations endpoint (enhanced)
app.post('/api/recommendations', async (req, res) => {
  try {
    const { mood, gameLength, platform, genre } = req.body;
    
    // Build recommendation query
    const where = {
      rating: { gte: 4.0 }, // Only recommend highly rated games
    };
    
    // Apply mood filter through genres
    if (mood) {
      const moodToGenres = {
        'Relaxing & Chill': ['Simulation', 'Puzzle', 'Casual'],
        'Intense Action': ['Action', 'Shooter', 'Fighting'],
        'Brain Teaser': ['Puzzle', 'Strategy', 'Card'],
        'Story-Driven': ['Adventure', 'RPG'],
        'Dark & Atmospheric': ['Horror', 'Adventure']
      };
      
      if (moodToGenres[mood]) {
        where.genres = {
          hasSome: moodToGenres[mood]
        };
      }
    }
    
    // Get recommendations
    const recommendations = await prisma.game.findMany({
      where,
      take: 10,
      orderBy: [
        { rating: 'desc' },
        { ratingsCount: 'desc' }
      ],
      select: {
        id: true,
        name: true,
        title: true,
        background_image: true,
        backgroundImage: true,
        rating: true,
        genres: true,
        playtime: true,
        released: true
      }
    });
    
    // Format recommendations with reasons
    const formattedRecs = recommendations.map(game => ({
      ...game,
      reason: `Based on your ${mood} mood preference`,
      matchScore: Math.random() * 20 + 80 // Placeholder for AI scoring
    }));
    
    res.json({ 
      recommendations: formattedRecs,
      totalFound: formattedRecs.length 
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Analytics endpoint for tracking user interactions
app.post('/api/analytics/interaction', async (req, res) => {
  try {
    const { gameId, action, userId, filters } = req.body;
    
    // Log user interactions for improving recommendations
    console.log('User interaction:', { gameId, action, userId, filters });
    
    // In production, you'd save this to a database table
    // await prisma.userInteraction.create({
    //   data: { gameId, action, userId, filters }
    // });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error logging interaction:', error);
    res.status(500).json({ error: 'Failed to log interaction' });
  }
});

app.listen(PORT, () => {
  console.log(`🎮 PlayTraq server running on http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop');
});