import React from 'react';
import { X, Plus, Heart, BookmarkPlus, List, Star, Clock, Calendar, Monitor, Tag, ExternalLink } from 'lucide-react';
import './gameModal.css';

function GameModal({ game, onClose }) {
  const handleAction = (action) => {
    // TODO: Implement these actions with your backend
    console.log(`${action} for game:`, game.id);
    alert(`${action} - This will be connected to your backend`);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="modal-body">
          {/* Left side - Poster */}
          <div className="modal-poster">
            {game.coverImage ? (
              <img src={game.coverImage} alt={game.title} />
            ) : (
              <div className="no-poster">No Image Available</div>
            )}
            
            {/* Action Buttons */}
            <div className="modal-actions">
              <button 
                className="action-btn primary"
                onClick={() => handleAction('Add to Collection')}
              >
                <Plus size={18} />
                Add to Collection
              </button>
              
              <button 
                className="action-btn"
                onClick={() => handleAction('Add to Wishlist')}
              >
                <Heart size={18} />
                Wishlist
              </button>
              
              <button 
                className="action-btn"
                onClick={() => handleAction('Add to Playlist')}
              >
                <BookmarkPlus size={18} />
                Save to Playlist
              </button>
              
              <button 
                className="action-btn"
                onClick={() => handleAction('Create List')}
              >
                <List size={18} />
                Add to List
              </button>
            </div>
          </div>

          {/* Right side - Details */}
          <div className="modal-details">
            <div className="modal-header">
              <h2>{game.title}</h2>
            </div>

            {/* Rating and Meta */}
            <div className="modal-meta">
              {game.rating && (
                <div className="meta-item rating">
                  <Star size={16} />
                  <span>{game.rating.toFixed(1)}</span>
                  {game.ratingCount && (
                    <span className="rating-count">({game.ratingCount.toLocaleString()} ratings)</span>
                  )}
                </div>
              )}
              
              {game.playtime && (
                <div className="meta-item">
                  <Clock size={16} />
                  <span>{game.playtime} hours average</span>
                </div>
              )}
              
              {game.released && (
                <div className="meta-item">
                  <Calendar size={16} />
                  <span>{new Date(game.released).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
              )}
            </div>

            {/* Description */}
            {game.description && (
              <div className="modal-section">
                <h3>About</h3>
                <p className="game-description">
                  {game.description}
                </p>
              </div>
            )}

            {/* Platforms */}
            {game.platforms && game.platforms.length > 0 && (
              <div className="modal-section">
                <h3>Platforms</h3>
                <div className="platform-tags">
                  {game.platforms.map(platform => (
                    <span key={platform} className="platform-tag">
                      <Monitor size={12} />
                      {platform}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Genres */}
            {game.genres && game.genres.length > 0 && (
              <div className="modal-section">
                <h3>Genres</h3>
                <div className="genre-tags">
                  {game.genres.map(genre => (
                    <span key={genre} className="genre-tag">
                      <Tag size={12} />
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Developers & Publishers */}
            {(game.developers?.length > 0 || game.publishers?.length > 0) && (
              <div className="modal-section">
                <div className="credits">
                  {game.developers && game.developers.length > 0 && (
                    <div>
                      <h4>Developers</h4>
                      <p>{game.developers.join(', ')}</p>
                    </div>
                  )}
                  {game.publishers && game.publishers.length > 0 && (
                    <div>
                      <h4>Publishers</h4>
                      <p>{game.publishers.join(', ')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tags */}
            {game.tags && game.tags.length > 0 && (
              <div className="modal-section">
                <h3>Tags</h3>
                <div className="game-tags">
                  {game.tags.slice(0, 10).map(tag => (
                    <span key={tag} className="tag-item">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* External Links */}
            {game.stores && game.stores.length > 0 && (
              <div className="modal-section">
                <h3>Available On</h3>
                <div className="store-links">
                  {game.stores.map((store, index) => {
                    const storeName = typeof store === 'string' ? store : store.name || store;
                    return (
                      <a 
                        key={index}
                        href="#" 
                        className="store-link"
                        onClick={(e) => {
                          e.preventDefault();
                          alert(`Link to ${storeName} - Coming soon`);
                        }}
                      >
                        <ExternalLink size={14} />
                        {storeName}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Additional Info */}
            <div className="modal-section additional-info">
              {game.metacritic && (
                <div className="info-item">
                  <span className="info-label">Metacritic:</span>
                  <span className="metacritic-score">{game.metacritic}</span>
                </div>
              )}
              {game.esrbRating && (
                <div className="info-item">
                  <span className="info-label">ESRB:</span>
                  <span>{game.esrbRating}</span>
                </div>
              )}
              {game.achievementCount && (
                <div className="info-item">
                  <span className="info-label">Achievements:</span>
                  <span>{game.achievementCount}</span>
                </div>
              )}
              {game.website && (
                <div className="info-item">
                  <span className="info-label">Website:</span>
                  <a href={game.website} target="_blank" rel="noopener noreferrer" className="website-link">
                    Official Site
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameModal;