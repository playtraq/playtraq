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

const PORT = process.env.PORT || 5000;

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to PlayTraq API!' });
});

// Get games from cache
app.get('/api/games', async (req, res) => {
  try {
    const { page = 1, limit = 40 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    // Get from YOUR database, not RAWG
    const games = await prisma.game.findMany({
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { rating: 'desc' }
    });
    
    const totalGames = await prisma.game.count();
    
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

// Search games
app.get('/api/games/search', async (req, res) => {
  try {
    const { q, page = 1 } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }
    const results = await gameService.searchGames(q, page);
    res.json(results);
  } catch (error) {
    console.error('Error:', error);
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

// AI Recommendations endpoint (placeholder for now)
app.post('/api/recommendations', async (req, res) => {
  try {
    const { mood, genres, preferredLength } = req.body;
    
    // For now, return mock recommendations
    // We'll add real AI integration later
    const mockRecommendations = [
      {
        title: "The Witcher 3",
        reason: "Perfect for your selected mood and genre preferences",
        releaseYear: 2015
      },
      {
        title: "Hades",
        reason: "Matches your gameplay length preference",
        releaseYear: 2020
      }
    ];
    
    res.json(mockRecommendations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

app.listen(PORT, () => {
  console.log(`🎮 PlayTraq server running on http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop');
});