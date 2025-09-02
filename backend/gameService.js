const axios = require('axios');
require('dotenv').config();

const RAWG_API_KEY = process.env.RAWG_API_KEY;
const RAWG_BASE_URL = 'https://api.rawg.io/api';

class GameService {
  // Search games from RAWG
  async searchGames(query, page = 1) {
    try {
      const response = await axios.get(`${RAWG_BASE_URL}/games`, {
        params: {
          key: RAWG_API_KEY,
          search: query,
          page: page,
          page_size: 20
        }
      });

      return {
        results: response.data.results.map(this.formatGame),
        count: response.data.count,
        next: response.data.next,
        previous: response.data.previous
      };
    } catch (error) {
      console.error('Error searching games:', error);
      throw error;
    }
  }

  // Get popular/trending games
  async getPopularGames(page = 1) {
    try {
      const response = await axios.get(`${RAWG_BASE_URL}/games`, {
        params: {
          key: RAWG_API_KEY,
          ordering: '-rating',
          page: page,
          page_size: 20,
          dates: '2020-01-01,2025-12-31', // Recent games
          metacritic: '80,100' // High quality games
        }
      });

      return {
        results: response.data.results.map(this.formatGame),
        count: response.data.count,
        next: response.data.next
      };
    } catch (error) {
      console.error('Error fetching popular games:', error);
      throw error;
    }
  }

  // Get new releases
  async getNewReleases(page = 1) {
    const today = new Date();
    const sixMonthsAgo = new Date(today.setMonth(today.getMonth() - 6));
    const dateRange = `${sixMonthsAgo.toISOString().split('T')[0]},${new Date().toISOString().split('T')[0]}`;

    try {
      const response = await axios.get(`${RAWG_BASE_URL}/games`, {
        params: {
          key: RAWG_API_KEY,
          dates: dateRange,
          ordering: '-released',
          page: page,
          page_size: 20
        }
      });

      return {
        results: response.data.results.map(this.formatGame),
        count: response.data.count
      };
    } catch (error) {
      console.error('Error fetching new releases:', error);
      throw error;
    }
  }

  // Get upcoming games
  async getUpcomingGames(page = 1) {
    const today = new Date().toISOString().split('T')[0];
    const nextYear = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

    try {
      const response = await axios.get(`${RAWG_BASE_URL}/games`, {
        params: {
          key: RAWG_API_KEY,
          dates: `${today},${nextYear}`,
          ordering: 'released',
          page: page,
          page_size: 20
        }
      });

      return {
        results: response.data.results.map(this.formatGame),
        count: response.data.count
      };
    } catch (error) {
      console.error('Error fetching upcoming games:', error);
      throw error;
    }
  }

  // Get single game details
  async getGameDetails(id) {
    try {
      const response = await axios.get(`${RAWG_BASE_URL}/games/${id}`, {
        params: {
          key: RAWG_API_KEY
        }
      });

      return this.formatGameDetails(response.data);
    } catch (error) {
      console.error('Error fetching game details:', error);
      throw error;
    }
  }

  // Get game screenshots
  async getGameScreenshots(id) {
    try {
      const response = await axios.get(`${RAWG_BASE_URL}/games/${id}/screenshots`, {
        params: {
          key: RAWG_API_KEY
        }
      });

      return response.data.results;
    } catch (error) {
      console.error('Error fetching screenshots:', error);
      return [];
    }
  }

  // Format game data for our frontend
  formatGame(game) {
    return {
      id: game.id,
      slug: game.slug,
      title: game.name,
      released: game.released,
      releaseYear: game.released ? new Date(game.released).getFullYear() : null,
      coverImage: game.background_image,
      rating: game.rating,
      ratingCount: game.ratings_count,
      metacritic: game.metacritic,
      genres: game.genres ? game.genres.map(g => g.name) : [],
      platforms: game.platforms ? game.platforms.map(p => p.platform.name) : [],
      stores: game.stores ? game.stores.map(s => ({
        id: s.store.id,
        name: s.store.name,
        url: s.url
      })) : [],
      shortScreenshots: game.short_screenshots ? game.short_screenshots.map(s => s.image) : [],
      esrbRating: game.esrb_rating ? game.esrb_rating.name : null,
      playtime: game.playtime // Average playtime in hours
    };
  }

  // Format detailed game data
  formatGameDetails(game) {
    return {
      ...this.formatGame(game),
      description: game.description_raw,
      website: game.website,
      redditUrl: game.reddit_url,
      redditName: game.reddit_name,
      metacriticUrl: game.metacritic_url,
      developers: game.developers ? game.developers.map(d => d.name) : [],
      publishers: game.publishers ? game.publishers.map(p => p.name) : [],
      achievementCount: game.achievements_count,
      tags: game.tags ? game.tags.map(t => t.name) : []
    };
  }

  // Get games by genre
  async getGamesByGenre(genre, page = 1) {
    try {
      const response = await axios.get(`${RAWG_BASE_URL}/games`, {
        params: {
          key: RAWG_API_KEY,
          genres: genre.toLowerCase(),
          ordering: '-rating',
          page: page,
          page_size: 20
        }
      });

      return {
        results: response.data.results.map(this.formatGame),
        count: response.data.count
      };
    } catch (error) {
      console.error('Error fetching games by genre:', error);
      throw error;
    }
  }

  // Get similar games
  async getSimilarGames(gameId) {
    try {
      const response = await axios.get(`${RAWG_BASE_URL}/games/${gameId}/game-series`, {
        params: {
          key: RAWG_API_KEY
        }
      });

      // Also fetch games from same developers
      const gameDetails = await this.getGameDetails(gameId);
      const developerGames = await this.searchGames(gameDetails.developers[0]);

      return {
        series: response.data.results.map(this.formatGame),
        fromDeveloper: developerGames.results.slice(0, 5)
      };
    } catch (error) {
      console.error('Error fetching similar games:', error);
      return { series: [], fromDeveloper: [] };
    }
  }
}

module.exports = new GameService();