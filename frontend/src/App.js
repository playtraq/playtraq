import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, User, ChevronDown, X, Plus, Heart, BookmarkPlus, List, Star, Clock, Calendar, Monitor, Tag, TrendingUp, Grid3x3, ListIcon } from 'lucide-react';
import './App.css';
import GameModal from './gameModal';

const API_URL = 'http://localhost:5001';

function App() {
  const [games, setGames] = useState([]);
  const [allGames, setAllGames] = useState([]);
  const [filteredGames, setFilteredGames] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalGames, setTotalGames] = useState(0);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedGame, setSelectedGame] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [uniquePlatforms, setUniquePlatforms] = useState([]);
  const [uniqueGenres, setUniqueGenres] = useState([]);
  
  // Filters state
  const [filters, setFilters] = useState({
    mood: '',
    length: '',
    platform: '',
    genre: ''
  });

  const [sortBy, setSortBy] = useState('popular');

  const gamesPerPage = 50; // Clean 5x10 grid

  // Mood mappings
  const moodToGenres = {
    'relaxing': ['Puzzle', 'Simulation', 'Casual', 'Indie', 'Card', 'Board Games'],
    'intense': ['Action', 'Shooter', 'Fighting', 'Arcade'],
    'story-driven': ['RPG', 'Adventure', 'Visual Novel'],
    'competitive': ['Sports', 'Racing', 'Fighting', 'MOBA'],
    'creative': ['Simulation', 'Sandbox', 'Platformer', 'Indie'],
    'strategic': ['Strategy', 'Card', 'Board Games', 'Puzzle']
  };

  // Fetch games on mount and page change
  useEffect(() => {
    fetchGames();
  }, [page]);

  // Extract unique platforms and genres when games load
  useEffect(() => {
    if (allGames.length > 0) {
      // Extract unique platforms
      const platforms = new Set();
      const genres = new Set();
      
      allGames.forEach(game => {
        if (game.platforms) {
          game.platforms.forEach(platform => platforms.add(platform));
        }
        if (game.genres) {
          game.genres.forEach(genre => genres.add(genre));
        }
      });
      
      setUniquePlatforms(Array.from(platforms).sort());
      setUniqueGenres(Array.from(genres).sort());
    }
  }, [allGames]);

  const fetchGames = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/games?page=${page}&limit=${gamesPerPage}`);
      const gamesData = response.data.results || [];
      setAllGames(gamesData);
      setGames(gamesData);
      setFilteredGames(gamesData);
      setTotalGames(response.data.total || 0);
    } catch (error) {
      console.error('Failed to fetch games:', error);
    }
    setLoading(false);
  };

  // Apply filters
  useEffect(() => {
    applyFiltersAndSort();
  }, [filters, sortBy, searchTerm, allGames]);

  const applyFiltersAndSort = () => {
    if (!allGames.length) return;
    
    let filtered = [...allGames];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(game => 
        game.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Mood filter
    if (filters.mood) {
      const targetGenres = moodToGenres[filters.mood] || [];
      filtered = filtered.filter(game => 
        game.genres && game.genres.some(g => targetGenres.includes(g))
      );
    }

    // Length filter
    if (filters.length) {
      filtered = filtered.filter(game => {
        const playtime = game.playtime || 0;
        switch(filters.length) {
          case 'short': return playtime <= 5;
          case 'medium': return playtime > 5 && playtime <= 20;
          case 'long': return playtime > 20 && playtime <= 50;
          case 'very-long': return playtime > 50;
          default: return true;
        }
      });
    }

    // Platform filter
    if (filters.platform) {
      filtered = filtered.filter(game => 
        game.platforms && game.platforms.includes(filters.platform)
      );
    }

    // Genre filter
    if (filters.genre) {
      filtered = filtered.filter(game => 
        game.genres && game.genres.includes(filters.genre)
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      switch(sortBy) {
        case 'popular': return (b.rating || 0) * (b.ratingCount || 0) - (a.rating || 0) * (a.ratingCount || 0);
        case 'highest-rated': return (b.rating || 0) - (a.rating || 0);
        case 'newest': 
          const dateA = a.released ? new Date(a.released).getTime() : 0;
          const dateB = b.released ? new Date(b.released).getTime() : 0;
          return dateB - dateA;
        case 'alphabetical': return (a.title || '').localeCompare(b.title || '');
        default: return 0;
      }
    });

    setFilteredGames(filtered);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: prev[filterType] === value ? '' : value
    }));
  };

  const clearFilters = () => {
    setFilters({
      mood: '',
      length: '',
      platform: '',
      genre: ''
    });
    setSearchTerm('');
  };

  const openGameModal = (game) => {
    setSelectedGame(game);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedGame(null);
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '') || searchTerm !== '';

  return (
    <div className="App">
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="logo">
            <h1>playtraq</h1>
          </div>

          <nav className="main-nav">
            <a href="#" className="nav-link active">GAMES</a>
            <a href="#" className="nav-link">LISTS</a>
            <a href="#" className="nav-link">MEMBERS</a>
            <a href="#" className="nav-link">JOURNAL</a>
          </nav>

          <div className="header-actions">
            <div className="search-container">
              <Search className="search-icon" size={18} />
              <input
                type="text"
                className="search-input"
                placeholder="Search games..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <button className="profile-btn">
              <User size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Filters Bar */}
      <div className="filters-bar">
        <div className="container">
          <div className="filters-grid">
            {/* Mood Filter */}
            <div className="filter-group">
              <label>MOOD</label>
              <div className="filter-dropdown">
                <button className="filter-trigger">
                  <span>{filters.mood || 'All'}</span>
                  <ChevronDown size={16} />
                </button>
                <div className="filter-menu">
                  <button onClick={() => handleFilterChange('mood', '')}>All</button>
                  <button onClick={() => handleFilterChange('mood', 'relaxing')}>Relaxing</button>
                  <button onClick={() => handleFilterChange('mood', 'intense')}>Intense</button>
                  <button onClick={() => handleFilterChange('mood', 'story-driven')}>Story-Driven</button>
                  <button onClick={() => handleFilterChange('mood', 'competitive')}>Competitive</button>
                  <button onClick={() => handleFilterChange('mood', 'creative')}>Creative</button>
                  <button onClick={() => handleFilterChange('mood', 'strategic')}>Strategic</button>
                </div>
              </div>
            </div>

            {/* Length Filter */}
            <div className="filter-group">
              <label>LENGTH</label>
              <div className="filter-dropdown">
                <button className="filter-trigger">
                  <span>{
                    filters.length === 'short' ? 'Short (&lt; 5h)' :
                    filters.length === 'medium' ? 'Medium (5-20h)' :
                    filters.length === 'long' ? 'Long (20-50h)' :
                    filters.length === 'very-long' ? 'Very Long (50+h)' :
                    'All'
                  }</span>
                  <ChevronDown size={16} />
                </button>
                <div className="filter-menu">
                  <button onClick={() => handleFilterChange('length', '')}>All</button>
                  <button onClick={() => handleFilterChange('length', 'short')}>Short (&lt; 5 hours)</button>
                  <button onClick={() => handleFilterChange('length', 'medium')}>Medium (5-20 hours)</button>
                  <button onClick={() => handleFilterChange('length', 'long')}>Long (20-50 hours)</button>
                  <button onClick={() => handleFilterChange('length', 'very-long')}>Very Long (50+ hours)</button>
                </div>
              </div>
            </div>

            {/* Platform Filter */}
            <div className="filter-group">
              <label>PLATFORM</label>
              <div className="filter-dropdown">
                <button className="filter-trigger">
                  <span>{filters.platform || 'All'}</span>
                  <ChevronDown size={16} />
                </button>
                <div className="filter-menu scrollable">
                  <button onClick={() => handleFilterChange('platform', '')}>All</button>
                  {uniquePlatforms.map(platform => (
                    <button key={platform} onClick={() => handleFilterChange('platform', platform)}>
                      {platform}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Genre Filter */}
            <div className="filter-group">
              <label>GENRE</label>
              <div className="filter-dropdown">
                <button className="filter-trigger">
                  <span>{filters.genre || 'All'}</span>
                  <ChevronDown size={16} />
                </button>
                <div className="filter-menu scrollable">
                  <button onClick={() => handleFilterChange('genre', '')}>All</button>
                  {uniqueGenres.map(genre => (
                    <button key={genre} onClick={() => handleFilterChange('genre', genre)}>
                      {genre}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="filter-actions">
              {hasActiveFilters && (
                <button className="clear-btn" onClick={clearFilters}>
                  <X size={16} />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Sort and View Controls */}
          <div className="sort-controls">
            <div className="sort-dropdown">
              <label>SORT BY</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="popular">Popular</option>
                <option value="highest-rated">Highest Rated</option>
                <option value="newest">Newest</option>
                <option value="alphabetical">A-Z</option>
              </select>
            </div>

            <div className="view-toggle">
              <button 
                className={viewMode === 'grid' ? 'active' : ''} 
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 size={18} />
              </button>
              <button 
                className={viewMode === 'list' ? 'active' : ''} 
                onClick={() => setViewMode('list')}
              >
                <ListIcon size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="main-content">
        <div className="container">
          {loading ? (
            <div className="loading">Loading games...</div>
          ) : (
            <>
              <div className="results-info">
                <h2>Browse Games</h2>
                <span className="results-count">
                  Showing {filteredGames.length} of {totalGames.toLocaleString()} games
                </span>
              </div>

              {viewMode === 'grid' ? (
                <div className="games-grid">
                  {filteredGames.map(game => (
                    <div key={game.id} className="game-card" onClick={() => openGameModal(game)}>
                      <div className="game-poster">
                        {game.coverImage ? (
                          <img src={game.coverImage} alt={game.title} />
                        ) : (
                          <div className="no-poster">No Image</div>
                        )}
                        <div className="game-info-bottom">
                          <h3>{game.title}</h3>
                          <div className="game-meta-hover">
                            <div className="meta-row-1">
                              <div className="rating-row">
                                <Star size={14} fill="var(--accent-green)" />
                                <span>{game.rating?.toFixed(1) || 'N/A'}</span>
                              </div>
                              {game.releaseYear && <span className="year">{game.releaseYear}</span>}
                              {game.playtime && <span className="playtime">{game.playtime}h</span>}
                            </div>
                            <div className="meta-row-2">
                              {game.genres && game.genres.length > 0 && (
                                <div className="mini-genres">
                                  {game.genres.slice(0, 2).map(genre => (
                                    <span key={genre} className="mini-genre">{genre}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="meta-row-3">
                              {game.platforms && game.platforms.length > 0 && (
                                <div className="mini-platforms">
                                  {game.platforms.slice(0, 3).map(platform => (
                                    <span key={platform} className="mini-platform">
                                      {platform.includes('PC') ? 'PC' :
                                       platform.includes('PlayStation') ? 'PS' :
                                       platform.includes('Xbox') ? 'XB' :
                                       platform.includes('Nintendo') ? 'NSW' :
                                       platform.slice(0, 3)}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {game.metacritic && (
                                <span className="metacritic-mini">
                                  MC: {game.metacritic}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="games-list">
                  {filteredGames.map(game => (
                    <div key={game.id} className="game-list-item" onClick={() => openGameModal(game)}>
                      <div className="list-poster">
                        {game.coverImage ? (
                          <img src={game.coverImage} alt={game.title} />
                        ) : (
                          <div className="no-poster">No Image</div>
                        )}
                      </div>
                      <div className="list-info">
                        <h3>{game.title}</h3>
                        <div className="list-meta">
                          <span className="list-rating">
                            <Star size={14} />
                            {game.rating?.toFixed(1) || 'N/A'}
                          </span>
                          {game.releaseYear && (
                            <span className="list-year">
                              <Calendar size={14} />
                              {game.releaseYear}
                            </span>
                          )}
                          {game.playtime && (
                            <span className="list-playtime">
                              <Clock size={14} />
                              {game.playtime}h
                            </span>
                          )}
                          {game.platforms && game.platforms.length > 0 && (
                            <span className="list-platform">
                              <Monitor size={14} />
                              {game.platforms[0]}
                            </span>
                          )}
                        </div>
                        {game.genres && game.genres.length > 0 && (
                          <div className="list-genres">
                            {game.genres.slice(0, 3).map(genre => (
                              <span key={genre} className="genre-tag">{genre}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              <div className="pagination">
                <button 
                  className="page-btn" 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <span className="page-info">
                  Page {page} of {Math.ceil(totalGames / gamesPerPage)}
                </span>
                <button 
                  className="page-btn" 
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(totalGames / gamesPerPage)}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Game Modal */}
      {modalOpen && selectedGame && (
        <GameModal game={selectedGame} onClose={closeModal} />
      )}
    </div>
  );
}

export default App;