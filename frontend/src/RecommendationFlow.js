import React, { useState, useEffect } from 'react';
import { ChevronRight, Clock, Users, Gamepad2, Heart, Brain, Trophy, Sparkles, Filter } from 'lucide-react';
import axios from 'axios';
import './RecommendationFlow.css';

const API_URL = 'http://localhost:5001';

function RecommendationFlow({ onRecommendations }) {
  const [step, setStep] = useState(1);
  const [preferences, setPreferences] = useState({
    similarGames: [],
    timeCommitment: '',
    mood: [],
    socialPreference: '',
    platforms: [],
    mechanics: [],
    themes: [],
    dealbreakers: []
  });

  // Popular games for "similar to" selection
  const [popularGames, setPopularGames] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  // Fetch popular games for reference
  useEffect(() => {
    fetchPopularGames();
  }, []);

  const fetchPopularGames = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/games?page=1`);
      setPopularGames(response.data.results.slice(0, 20));
    } catch (error) {
      console.error('Failed to fetch games:', error);
    }
  };

  const searchGames = async (query) => {
    if (!query) return;
    setSearching(true);
    try {
      const response = await axios.get(`${API_URL}/api/games/search?q=${query}`);
      setPopularGames(response.data.results);
    } catch (error) {
      console.error('Search failed:', error);
    }
    setSearching(false);
  };

  // Time commitment options
  const timeOptions = [
    { id: 'bite-sized', label: 'Bite-sized (< 5 mins)', icon: '🍬', description: 'Quick breaks' },
    { id: 'short-sessions', label: 'Short Sessions (15-30 mins)', icon: '☕', description: 'Coffee break gaming' },
    { id: 'medium-sessions', label: 'Medium Sessions (1-2 hours)', icon: '🎮', description: 'Evening gaming' },
    { id: 'long-sessions', label: 'Long Sessions (3+ hours)', icon: '🌙', description: 'Weekend binges' },
    { id: 'endless', label: 'Endless/100+ hours', icon: '♾️', description: 'Life commitment' }
  ];

  // Mood options (multiple choice)
  const moodOptions = [
    { id: 'relaxing', label: 'Relaxing & Chill', icon: '😌', color: '#4fc3f7' },
    { id: 'challenging', label: 'Challenging & Intense', icon: '💪', color: '#f44336' },
    { id: 'story-rich', label: 'Story & Narrative', icon: '📚', color: '#9c27b0' },
    { id: 'creative', label: 'Creative & Building', icon: '🏗️', color: '#4caf50' },
    { id: 'competitive', label: 'Competitive & PvP', icon: '⚔️', color: '#ff9800' },
    { id: 'exploration', label: 'Exploration & Discovery', icon: '🗺️', color: '#009688' },
    { id: 'mindless', label: 'Mindless Fun', icon: '🎈', color: '#e91e63' },
    { id: 'horror', label: 'Scary & Thrilling', icon: '👻', color: '#424242' }
  ];

  // Social preferences
  const socialOptions = [
    { id: 'solo', label: 'Solo Only', icon: '🧘', description: 'Just me and the game' },
    { id: 'optional-multi', label: 'Optional Multiplayer', icon: '🤝', description: 'Solo with friends option' },
    { id: 'co-op', label: 'Co-op Focus', icon: '👥', description: 'Better with friends' },
    { id: 'competitive', label: 'Competitive Multi', icon: '🏆', description: 'PvP and rankings' },
    { id: 'local', label: 'Local/Couch Co-op', icon: '🛋️', description: 'Same room gaming' },
    { id: 'mmo', label: 'MMO/Massive', icon: '🌐', description: 'Thousands of players' }
  ];

  // Platform options
  const platformOptions = [
    { id: 'pc', label: 'PC', icon: '💻' },
    { id: 'steam-deck', label: 'Steam Deck', icon: '🎮' },
    { id: 'ps5', label: 'PlayStation 5', icon: '🎯' },
    { id: 'xbox-series', label: 'Xbox Series X/S', icon: '🟢' },
    { id: 'switch', label: 'Nintendo Switch', icon: '🔴' },
    { id: 'mobile', label: 'Mobile', icon: '📱' },
    { id: 'low-spec-pc', label: 'Low-Spec PC', icon: '🥔' }
  ];

  // Mechanics preferences
  const mechanicsOptions = [
    { id: 'turn-based', label: 'Turn-Based' },
    { id: 'real-time', label: 'Real-Time' },
    { id: 'open-world', label: 'Open World' },
    { id: 'linear', label: 'Linear/Guided' },
    { id: 'roguelike', label: 'Roguelike/Roguelite' },
    { id: 'puzzle', label: 'Puzzle Solving' },
    { id: 'platformer', label: 'Platforming' },
    { id: 'survival', label: 'Survival' },
    { id: 'crafting', label: 'Crafting/Building' },
    { id: 'stealth', label: 'Stealth' },
    { id: 'rhythm', label: 'Rhythm/Music' },
    { id: 'card-based', label: 'Card/Deck Building' }
  ];

  // Theme preferences
  const themeOptions = [
    { id: 'fantasy', label: 'Fantasy', icon: '🐉' },
    { id: 'sci-fi', label: 'Sci-Fi', icon: '🚀' },
    { id: 'post-apocalyptic', label: 'Post-Apocalyptic', icon: '☢️' },
    { id: 'historical', label: 'Historical', icon: '⚔️' },
    { id: 'modern', label: 'Modern/Contemporary', icon: '🏙️' },
    { id: 'cyberpunk', label: 'Cyberpunk', icon: '🤖' },
    { id: 'western', label: 'Western', icon: '🤠' },
    { id: 'anime', label: 'Anime/JRPG', icon: '🌸' },
    { id: 'cute', label: 'Cute/Wholesome', icon: '🌈' },
    { id: 'dark', label: 'Dark/Mature', icon: '🌑' }
  ];

  // Dealbreakers
  const dealbreakerOptions = [
    { id: 'no-violence', label: 'No Violence' },
    { id: 'no-microtransactions', label: 'No Microtransactions' },
    { id: 'no-grinding', label: 'No Grinding' },
    { id: 'no-permadeath', label: 'No Permadeath' },
    { id: 'no-time-limits', label: 'No Time Pressure' },
    { id: 'no-multiplayer-required', label: 'No Forced Multiplayer' },
    { id: 'no-subscription', label: 'No Subscription' },
    { id: 'family-friendly', label: 'Must be Family Friendly' }
  ];

  const handleGameToggle = (game) => {
    setPreferences(prev => ({
      ...prev,
      similarGames: prev.similarGames.find(g => g.id === game.id)
        ? prev.similarGames.filter(g => g.id !== game.id)
        : [...prev.similarGames, game]
    }));
  };

  const handleMultiSelect = (field, value) => {
    setPreferences(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value]
    }));
  };

  const getRecommendations = async () => {
    // Here we'll send all preferences to backend
    const payload = {
      ...preferences,
      similarGameIds: preferences.similarGames.map(g => g.id),
      similarGameTitles: preferences.similarGames.map(g => g.title)
    };

    try {
      const response = await axios.post(`${API_URL}/api/recommendations/smart`, payload);
      onRecommendations(response.data);
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      // For now, return mock data
      onRecommendations([
        { 
          id: 1, 
          title: 'Hades', 
          reason: 'Similar roguelike mechanics to your favorites with perfect session length',
          matchScore: 95 
        },
        { 
          id: 2, 
          title: 'Outer Wilds', 
          reason: 'Exploration focus with mind-bending puzzles and no combat',
          matchScore: 88 
        }
      ]);
    }
  };

  const canProceed = () => {
    switch(step) {
      case 1: return preferences.similarGames.length > 0 || preferences.timeCommitment;
      case 2: return preferences.mood.length > 0;
      case 3: return preferences.socialPreference;
      case 4: return preferences.platforms.length > 0;
      case 5: return true; // Mechanics optional
      case 6: return true; // Themes optional
      case 7: return true; // Dealbreakers optional
      default: return false;
    }
  };

  const skipStep = () => {
    if (step < 7) setStep(step + 1);
    else getRecommendations();
  };

  return (
    <div className="recommendation-flow">
      <div className="flow-header">
        <h2>🎯 Find Your Perfect Game</h2>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(step / 7) * 100}%` }}></div>
        </div>
        <p className="step-indicator">Step {step} of 7</p>
      </div>

      {/* Step 1: Similar Games & Time */}
      {step === 1 && (
        <div className="flow-step">
          <h3>What games do you love? Or how much time do you have?</h3>
          <p className="step-description">Pick games similar to what you want, or skip to time preferences</p>
          
          <div className="search-section">
            <input
              type="text"
              placeholder="Search for a game you love..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchGames(searchQuery)}
              className="game-search"
            />
          </div>

          <div className="games-grid">
            {popularGames.map(game => (
              <div 
                key={game.id}
                className={`game-select-card ${preferences.similarGames.find(g => g.id === game.id) ? 'selected' : ''}`}
                onClick={() => handleGameToggle(game)}
              >
                {game.coverImage && <img src={game.coverImage} alt={game.title} />}
                <span>{game.title}</span>
                {preferences.similarGames.find(g => g.id === game.id) && <span className="check">✓</span>}
              </div>
            ))}
          </div>

          <div className="divider">OR</div>

          <h4>How long do you want to play?</h4>
          <div className="time-options">
            {timeOptions.map(option => (
              <div
                key={option.id}
                className={`option-card ${preferences.timeCommitment === option.id ? 'selected' : ''}`}
                onClick={() => setPreferences({...preferences, timeCommitment: option.id})}
              >
                <span className="option-icon">{option.icon}</span>
                <span className="option-label">{option.label}</span>
                <span className="option-desc">{option.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Mood */}
      {step === 2 && (
        <div className="flow-step">
          <h3>What mood are you in? (Pick all that apply)</h3>
          <div className="mood-grid">
            {moodOptions.map(mood => (
              <div
                key={mood.id}
                className={`mood-card ${preferences.mood.includes(mood.id) ? 'selected' : ''}`}
                style={{ borderColor: preferences.mood.includes(mood.id) ? mood.color : '#333' }}
                onClick={() => handleMultiSelect('mood', mood.id)}
              >
                <span className="mood-icon">{mood.icon}</span>
                <span className="mood-label">{mood.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Social */}
      {step === 3 && (
        <div className="flow-step">
          <h3>Playing alone or with others?</h3>
          <div className="social-options">
            {socialOptions.map(option => (
              <div
                key={option.id}
                className={`social-card ${preferences.socialPreference === option.id ? 'selected' : ''}`}
                onClick={() => setPreferences({...preferences, socialPreference: option.id})}
              >
                <span className="social-icon">{option.icon}</span>
                <span className="social-label">{option.label}</span>
                <span className="social-desc">{option.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Platforms */}
      {step === 4 && (
        <div className="flow-step">
          <h3>What can you play on? (Select all)</h3>
          <div className="platform-grid">
            {platformOptions.map(platform => (
              <div
                key={platform.id}
                className={`platform-card ${preferences.platforms.includes(platform.id) ? 'selected' : ''}`}
                onClick={() => handleMultiSelect('platforms', platform.id)}
              >
                <span className="platform-icon">{platform.icon}</span>
                <span className="platform-label">{platform.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 5: Mechanics */}
      {step === 5 && (
        <div className="flow-step">
          <h3>Gameplay mechanics you enjoy? (Optional)</h3>
          <div className="mechanics-grid">
            {mechanicsOptions.map(mechanic => (
              <div
                key={mechanic.id}
                className={`mechanic-tag ${preferences.mechanics.includes(mechanic.id) ? 'selected' : ''}`}
                onClick={() => handleMultiSelect('mechanics', mechanic.id)}
              >
                {mechanic.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 6: Themes */}
      {step === 6 && (
        <div className="flow-step">
          <h3>Favorite settings/themes? (Optional)</h3>
          <div className="theme-grid">
            {themeOptions.map(theme => (
              <div
                key={theme.id}
                className={`theme-card ${preferences.themes.includes(theme.id) ? 'selected' : ''}`}
                onClick={() => handleMultiSelect('themes', theme.id)}
              >
                <span className="theme-icon">{theme.icon}</span>
                <span className="theme-label">{theme.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 7: Dealbreakers */}
      {step === 7 && (
        <div className="flow-step">
          <h3>Any dealbreakers? (Optional)</h3>
          <p className="step-description">Things you absolutely want to avoid</p>
          <div className="dealbreaker-grid">
            {dealbreakerOptions.map(deal => (
              <div
                key={deal.id}
                className={`dealbreaker-tag ${preferences.dealbreakers.includes(deal.id) ? 'selected' : ''}`}
                onClick={() => handleMultiSelect('dealbreakers', deal.id)}
              >
                ❌ {deal.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flow-navigation">
        {step > 1 && (
          <button className="nav-back" onClick={() => setStep(step - 1)}>
            ← Back
          </button>
        )}
        
        <button className="nav-skip" onClick={skipStep}>
          {step === 1 ? 'Skip to Next' : 'Skip'}
        </button>

        {step < 7 ? (
          <button 
            className="nav-next" 
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
          >
            Next <ChevronRight />
          </button>
        ) : (
          <button 
            className="nav-finish" 
            onClick={getRecommendations}
          >
            <Sparkles /> Get My Recommendations
          </button>
        )}
      </div>
    </div>
  );
}

export default RecommendationFlow;