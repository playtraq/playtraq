import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Star, Calendar, Clock, Plus, Gamepad2, Filter, ChevronLeft, ChevronRight, Grid, List } from 'lucide-react';
import './App.css';

const API_URL = 'http://localhost:5001';

function App() {
  const [games, setGames] = useState([]);
  const [allGames, setAllGames] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('browse');
  const [page, setPage] = useState(1);
  const [totalGames, setTotalGames] = useState(0);
  const [sortBy, setSortBy] = useState('rating');
  const [viewMode, setViewMode] = useState('grid');
  
  // Recommendation filters
  const [filters, setFilters] = useState({
    mood: '',
    timeCommitment: '',
    platform: '',
    genre: ''
  });

  const gamesPerPage = 40;

  // Fetch games on mount and page change
  useEffect(() => {
    fetchGames();
  }, [page]);

  const fetchGames = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/games?page=${page}&limit=${gamesPerPage}`);
      const gamesData = response.data.results || [];
      setAllGames(gamesData);
      setGames(gamesData);
      setTotalGames(response.data.total || 0);
      console.log(`Loaded ${gamesData.length} games from total of ${response.data.total}`);
    } catch (error) {
      console.error('Failed to fetch games:', error);
    }
    setLoading(false);
  };

  const searchGames = async (query) => {
    if (!query) {
      setGames(allGames);
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/games/search?q=${query}`);
      setGames(response.data.results || []);
    } catch (error) {
      console.error('Search failed:', error);
    }
    setLoading(false);
  };

  // Handle search with debounce
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchTerm) {
        searchGames(searchTerm);
      } else {
        setGames(allGames);
      }
    }, 500);

    return () => clearTimeout(delaySearch);
  }, [searchTerm, allGames]);

  // Apply filters and sorting
  const applyFiltersAndSort = () => {
    if (!allGames.length) return;
    
    let filtered = [...allGames];

    // Apply mood filter
    if (filters.mood) {
      const moodMap = {
        'relaxing': ['Puzzle', 'Simulation', 'Casual', 'Indie'],
        'intense': ['Action', 'Shooter', 'Fighting'],
        'story': ['RPG', 'Adventure'],
        'competitive': ['Sports', 'Racing', 'Fighting']
      };
      const targetGenres = moodMap[filters.mood] || [];
      filtered = filtered.filter(game => 
        game.genres && Array.isArray(game.genres) && 
        game.genres.some(g => targetGenres.includes(g))
      );
    }

    // Apply time commitment filter
    if (filters.timeCommitment) {
      filtered = filtered.filter(game => {
        const playtime = game.playtime || 0;
        switch(filters.timeCommitment) {
          case 'quick': return playtime <= 5;
          case 'medium': return playtime > 5 && playtime <= 20;
          case 'long': return playtime > 20 && playtime <= 50;
          case 'endless': return playtime > 50;
          default: return true;
        }
      });
    }

    // Apply platform filter
    if (filters.platform) {
      filtered = filtered.filter(game => 
        game.platforms && Array.isArray(game.platforms) && 
        game.platforms.includes(filters.platform)
      );
    }

    // Apply genre filter
    if (filters.genre) {
      filtered = filtered.filter(game => 
        game.genres && Array.isArray(game.genres) && 
        game.genres.includes(filters.genre)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch(sortBy) {
        case 'rating': return (b.rating || 0) - (a.rating || 0);
        case 'recent': 
          const dateA = a.released ? new Date(a.released).getTime() : 0;
          const dateB = b.released ? new Date(b.released).getTime() : 0;
          return dateB - dateA;
        case 'name': return (a.title || '').localeCompare(b.title || '');
        default: return 0;
      }
    });

    setGames(filtered);
  };

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Apply filters when they change
  useEffect(() => {
    if (allGames.length > 0) {
      applyFiltersAndSort();
    }
  }, [filters, sortBy, allGames]);

  const resetFilters = () => {
    setFilters({
      mood: '',
      timeCommitment: '',
      platform: '',
      genre: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  return (
    <div className="App">
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="logo">
            <Gamepad2 size={32} />
            <h1>playtraq</h1>
          </div>

          <div className="search-bar">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search games..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <nav className="nav">
            <button 
              className={view === 'browse' ? 'active' : ''} 
              onClick={() => setView('browse')}
            >
              Browse
            </button>
            <button 
              className={view === 'library' ? 'active' : ''} 
              onClick={() => setView('library')}
            >
              My Library
            </button>
            <button className="nav-profile">
              <div className="avatar-placeholder" />
            </button>
          </nav>
        </div>
      </header>

      {/* Filters Bar */}
      <div className="filters-bar">
        <div className="container">
          <div className="filters-row">
            <select 
              value={filters.mood} 
              onChange={(e) => handleFilterChange('mood', e.target.value)}
              className="filter-select"
            >
              <option value="">Any Mood</option>
              <option value="relaxing">Relaxing</option>
              <option value="intense">Intense</option>
              <option value="story">Story-Rich</option>
              <option value="competitive">Competitive</option>
            </select>

            <select 
              value={filters.timeCommitment} 
              onChange={(e) => handleFilterChange('timeCommitment', e.target.value)}
              className="filter-select"
            >
              <option value="">Any Length</option>
              <option value="quick">Quick (under 5 hrs)</option>
              <option value="medium">Medium (5-20 hrs)</option>
              <option value="long">Long (20-50 hrs)</option>
              <option value="endless">Endless (50+ hrs)</option>
            </select>

            <select 
              value={filters.platform} 
              onChange={(e) => handleFilterChange('platform', e.target.value)}
              className="filter-select"
            >
              <option value="">All Platforms</option>
              <option value="PC">PC</option>
              <option value="PlayStation 5">PlayStation 5</option>
              <option value="Xbox Series S/X">Xbox Series</option>
              <option value="Nintendo Switch">Switch</option>
            </select>

            <select 
              value={filters.genre} 
              onChange={(e) => handleFilterChange('genre', e.target.value)}
              className="filter-select"
            >
              <option value="">All Genres</option>
              <option value="Action">Action</option>
              <option value="Adventure">Adventure</option>
              <option value="RPG">RPG</option>
              <option value="Strategy">Strategy</option>
              <option value="Shooter">Shooter</option>
              <option value="Puzzle">Puzzle</option>
              <option value="Platformer">Platformer</option>
              <option value="Racing">Racing</option>
              <option value="Sports">Sports</option>
              <option value="Simulation">Simulation</option>
            </select>

            {hasActiveFilters && (
              <button onClick={resetFilters} className="reset-filters-btn">
                Reset Filters
              </button>
            )}
          </div>

          <div className="sort-controls">
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="rating">Top Rated</option>
              <option value="recent">Most Recent</option>
              <option value="name">Alphabetical</option>
            </select>

            <div className="view-toggles">
              <button 
                className={viewMode === 'grid' ? 'active' : ''}
                onClick={() => setViewMode('grid')}
              >
                <Grid size={18} />
              </button>
              <button 
                className={viewMode === 'list' ? 'active' : ''}
                onClick={() => setViewMode('list')}
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="main-content">
        <div className="container">
          {view === 'browse' && (
            <>
              {loading ? (
                <div className="loading-state">
                  <p>Loading games...</p>
                </div>
              ) : (
                <>
                  <div className="results-header">
                    <h2>
                      {hasActiveFilters ? 'Filtered Results' : 'All Games'}
                      <span className="results-count"> ({hasActiveFilters ? games.length : totalGames.toLocaleString()} games)</span>
                    </h2>
                  </div>

                  {games.length === 0 ? (
                    <div className="empty-state">
                      <p>No games found matching your criteria.</p>
                      {hasActiveFilters && (
                        <button onClick={resetFilters} className="reset-filters-btn">
                          Reset Filters
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className={viewMode === 'grid' ? 'games-grid' : 'games-list'}>
                        {games.slice(0, gamesPerPage).map(game => (
                          <div key={game.id} className={viewMode === 'grid' ? 'game-card' : 'game-card-list'}>
                            <div className="game-cover">
                              <img src={game.coverImage} alt={game.title} />
                              <div className="game-overlay">
                                <button className="add-btn">
                                  <Plus size={20} />
                                  Add to Library
                                </button>
                              </div>
                            </div>
                            <div className="game-info">
                              <h3>{game.title}</h3>
                              <div className="game-meta">
                                <span className="year">
                                  <Calendar size={14} />
                                  {game.releaseYear}
                                </span>
                                <span className="rating">
                                  <Star size={14} />
                                  {game.rating?.toFixed(1) || 'N/A'}
                                </span>
                                {game.playtime && (
                                  <span className="playtime">
                                    <Clock size={14} />
                                    {game.playtime}h
                                  </span>
                                )}
                              </div>
                              <div className="game-genres">
                                {game.genres?.slice(0, 3).map(g => (
                                  <span key={g} className="genre-tag">{g}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Modern Pagination */}
                      <div className="pagination-modern">
                        <button 
                          onClick={() => setPage(1)}
                          disabled={page === 1}
                          className="page-btn"
                          title="First page"
                        >
                          «
                        </button>
                        <button 
                          onClick={() => setPage(Math.max(1, page - 1))}
                          disabled={page === 1}
                          className="page-btn"
                        >
                          <ChevronLeft size={18} />
                        </button>
                        
                        <div className="page-numbers">
                          {(() => {
                            const totalPages = Math.ceil(totalGames / gamesPerPage);
                            const pageNumbers = [];
                            const maxVisible = 5;
                            
                            if (totalPages <= maxVisible) {
                              for (let i = 1; i <= totalPages; i++) {
                                pageNumbers.push(i);
                              }
                            } else {
                              if (page <= 3) {
                                for (let i = 1; i <= 4; i++) pageNumbers.push(i);
                                pageNumbers.push('...');
                                pageNumbers.push(totalPages);
                              } else if (page >= totalPages - 2) {
                                pageNumbers.push(1);
                                pageNumbers.push('...');
                                for (let i = totalPages - 3; i <= totalPages; i++) pageNumbers.push(i);
                              } else {
                                pageNumbers.push(1);
                                pageNumbers.push('...');
                                for (let i = page - 1; i <= page + 1; i++) pageNumbers.push(i);
                                pageNumbers.push('...');
                                pageNumbers.push(totalPages);
                              }
                            }
                            
                            return pageNumbers.map((num, idx) => (
                              num === '...' ? (
                                <span key={`dots-${idx}`} className="page-dots">...</span>
                              ) : (
                                <button
                                  key={num}
                                  onClick={() => setPage(num)}
                                  className={`page-number ${page === num ? 'active' : ''}`}
                                >
                                  {num}
                                </button>
                              )
                            ));
                          })()}
                        </div>
                        
                        <button 
                          onClick={() => setPage(page + 1)}
                          disabled={page >= Math.ceil(totalGames / gamesPerPage)}
                          className="page-btn"
                        >
                          <ChevronRight size={18} />
                        </button>
                        <button 
                          onClick={() => setPage(Math.ceil(totalGames / gamesPerPage))}
                          disabled={page >= Math.ceil(totalGames / gamesPerPage)}
                          className="page-btn"
                          title="Last page"
                        >
                          »
                        </button>
                        
                        <div className="page-info">
                          <span>Page {page} of {Math.ceil(totalGames / gamesPerPage)}</span>
                          <span className="page-range">
                            Showing {((page - 1) * gamesPerPage) + 1}-{Math.min(page * gamesPerPage, totalGames)} of {totalGames.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}

          {view === 'library' && (
            <div className="library-view">
              <h2>My Game Library</h2>
              <div className="library-stats">
                <div className="stat-card">
                  <h4>Currently Playing</h4>
                  <p className="stat-number">0</p>
                </div>
                <div className="stat-card">
                  <h4>Completed</h4>
                  <p className="stat-number">0</p>
                </div>
                <div className="stat-card">
                  <h4>Want to Play</h4>
                  <p className="stat-number">0</p>
                </div>
              </div>
              <p className="empty-state">Add games to build your library!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;