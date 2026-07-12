import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MediaCard from '../components/MediaCard';
import { getMovies } from '../../services/mediaService';
import { Film, Search, ChevronRight, ChevronLeft, Star, TrendingUp, Sparkles } from 'lucide-react';

const ACCENT = '#e8b84b';
const ACCENT_DIM = 'rgba(232,184,75,0.1)';
const ACCENT_GLOW = 'rgba(232,184,75,0.2)';

// Genre row config - customize which genres appear and their order
const FEATURED_GENRES = [
  { name: 'Trending Now', icon: TrendingUp, gradient: 'linear-gradient(135deg, #e8b84b, #e05fa0)' },
  { name: 'Action', icon: Sparkles, gradient: 'linear-gradient(135deg, #ff4444, #cc0000)' },
  { name: 'Comedy', gradient: 'linear-gradient(135deg, #ff9800, #f57c00)' },
  { name: 'Science Fiction', gradient: 'linear-gradient(135deg, #4fc3f7, #0288d1)' },
  { name: 'Horror', gradient: 'linear-gradient(135deg, #7b1fa2, #4a0072)' },
  { name: 'Romance', gradient: 'linear-gradient(135deg, #ec407a, #c2185b)' },
  { name: 'Drama', gradient: 'linear-gradient(135deg, #5c6bc0, #283593)' },
  { name: 'Thriller', gradient: 'linear-gradient(135deg, #26a69a, #00695c)' },
  { name: 'Animation', gradient: 'linear-gradient(135deg, #ff7043, #e64a19)' },
  { name: 'Adventure', gradient: 'linear-gradient(135deg, #66bb6a, #2e7d32)' },
];

export default function Movies() {
  const navigate = useNavigate();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [activeGenre, setActiveGenre] = useState(null);

  useEffect(() => {
    getMovies()
      .then(data => setMovies(Array.isArray(data) ? data.filter(m => !m.type || m.type === 'movie') : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Group movies by genre
  const genreMovies = useMemo(() => {
    const groups = {};
    
    FEATURED_GENRES.forEach(({ name }) => {
      if (name === 'Trending Now') {
        // Trending = top rated
        groups[name] = [...movies]
          .sort((a, b) => {
            const ra = typeof a.rating === 'object' ? a.rating.percentage / 10 : (a.rating || 0);
            const rb = typeof b.rating === 'object' ? b.rating.percentage / 10 : (b.rating || 0);
            return rb - ra;
          })
          .slice(0, 20);
      } else {
        groups[name] = movies.filter(m => 
          (m.genres || []).some(g => g.toLowerCase() === name.toLowerCase())
        ).slice(0, 20);
      }
    });

    return groups;
  }, [movies]);

  // Search results
  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return movies.filter(m =>
      m.title?.toLowerCase().includes(q) ||
      (m.genres || []).some(g => g.toLowerCase().includes(q))
    ).slice(0, 30);
  }, [movies, search]);

  // All movies for grid view
  const allMoviesSorted = useMemo(() => {
    return [...movies].sort((a, b) => {
      const ra = typeof a.rating === 'object' ? a.rating.percentage / 10 : (a.rating || 0);
      const rb = typeof b.rating === 'object' ? b.rating.percentage / 10 : (b.rating || 0);
      return rb - ra;
    });
  }, [movies]);

  // Horizontal scroll row component
  const MovieRow = ({ title, movies: rowMovies, gradient, icon: Icon, isFirst }) => (
    <div style={{ marginBottom: isFirst ? 36 : 44 }}>
      {/* Row Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {Icon && (
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: gradient || ACCENT_DIM,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={16} color="#fff" />
            </div>
          )}
          <h2 style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 18, fontWeight: 700,
            color: '#e8eaf0', margin: 0,
            letterSpacing: '-0.3px',
          }}>
            {title}
          </h2>
          <span style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12, color: '#3a4560',
            fontWeight: 500,
          }}>
            {rowMovies.length} titles
          </span>
        </div>
        <button
          onClick={() => {
            setActiveGenre(title);
            setShowAll(true);
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif", fontSize: 13,
            color: '#6878a0', fontWeight: 500,
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.target.style.color = ACCENT}
          onMouseLeave={e => e.target.style.color = '#6878a0'}
        >
          See All <ChevronRight size={14} />
        </button>
      </div>

      {/* Horizontal Scroll */}
      <div style={{
        display: 'flex', gap: 14, overflowX: 'auto',
        padding: '4px 32px 12px',
        scrollbarWidth: 'none',
        scrollSnapType: 'x mandatory',
      }}>
        {rowMovies.slice(0, 20).map((movie, i) => (
          <div key={movie._id || i} style={{ flexShrink: 0, scrollSnapAlign: 'start' }}>
            <MediaCard media={movie} type="movie" index={i} size="md" />
          </div>
        ))}
      </div>
    </div>
  );

  // ── Loading Skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ background: '#080c14', minHeight: '100vh', paddingTop: 80 }}>
        <style>{skeletonStyles}</style>
        <div style={{ padding: '32px 32px 0' }}>
          <div style={{ width: 200, height: 40, background: '#0d1420', borderRadius: 8, marginBottom: 32 }} className="mv-skeleton" />
          {[1, 2, 3, 4].map(row => (
            <div key={row} style={{ marginBottom: 44 }}>
              <div style={{ width: 150, height: 20, background: '#0d1420', borderRadius: 6, marginBottom: 16, marginLeft: 32 }} className="mv-skeleton" />
              <div style={{ display: 'flex', gap: 14, padding: '0 32px', overflow: 'hidden' }}>
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                  <div key={i} className="mv-skeleton" style={{ width: 160, height: 235, flexShrink: 0, borderRadius: 10 }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Show All Modal ────────────────────────────────────────────────────────
  if (showAll && activeGenre) {
    const displayMovies = activeGenre === 'Trending Now' 
      ? allMoviesSorted 
      : movies.filter(m => (m.genres || []).some(g => g.toLowerCase() === activeGenre.toLowerCase()));

    return (
      <div style={{ background: '#080c14', minHeight: '100vh', paddingTop: 80 }}>
        <div style={{ padding: '32px 32px 0' }}>
          <button onClick={() => { setShowAll(false); setActiveGenre(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#6878a0', marginBottom: 24 }}>
            <ChevronLeft size={16} /> Back to Movies
          </button>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(28px, 3vw, 44px)',
            fontWeight: 900, color: '#e8eaf0', margin: '0 0 8px' }}>{activeGenre}</h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#3a4560', fontSize: 14, marginBottom: 28 }}>
            {displayMovies.length} movies
          </p>
          <div className="mv-grid" style={gridStyles}>
            {displayMovies.map((movie, i) => (
              <MediaCard key={movie._id || i} media={movie} type="movie" index={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Main Netflix-Style Layout ─────────────────────────────────────────────
  return (
    <div style={{ background: '#080c14', minHeight: '100vh', paddingTop: 80 }}>
      <style>{rowStyles}</style>

      {/* Hero Header */}
      <div style={{
        padding: '40px 32px 32px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Film size={18} color={ACCENT} strokeWidth={1.5} />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600,
                color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Collection</span>
            </div>
            <h1 style={{ fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 900,
              color: '#e8eaf0', margin: 0, letterSpacing: '-1px' }}>
              Movies
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: ACCENT }}>{movies.length}</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#3a4560', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total</div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ marginTop: 24 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, maxWidth: 480,
            background: searchFocused ? 'rgba(232,184,75,0.05)' : '#0d1420',
            border: `1px solid ${searchFocused ? `${ACCENT}44` : 'rgba(255,255,255,0.07)'}`,
            borderRadius: 12, padding: '0 16px', transition: 'all 0.2s',
            boxShadow: searchFocused ? `0 0 0 3px ${ACCENT_GLOW}` : 'none',
          }}>
            <Search size={15} color={searchFocused ? ACCENT : '#3a4560'} />
            <input
              type="text"
              placeholder="Search movies by title or genre..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none',
                fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#c8d0e0', padding: '13px 0' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search Results */}
      {search && searchResults.length > 0 && (
        <div style={{ padding: '0 32px 40px' }}>
          <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, fontWeight: 700, color: '#e8eaf0', marginBottom: 16 }}>
            Results for "{search}"
          </h2>
          <div className="mv-grid" style={gridStyles}>
            {searchResults.map((movie, i) => (
              <MediaCard key={movie._id || i} media={movie} type="movie" index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Genre Rows - Netflix Style */}
      {!search && FEATURED_GENRES.map((genre, index) => {
        const rowMovies = genreMovies[genre.name] || [];
        if (rowMovies.length === 0) return null;
        return (
          <MovieRow
            key={genre.name}
            title={genre.name}
            movies={rowMovies}
            gradient={genre.gradient}
            icon={genre.icon}
            isFirst={index === 0}
          />
        );
      })}
    </div>
  );
}

const skeletonStyles = `
  @keyframes mv-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  .mv-skeleton { background: linear-gradient(90deg, #0d1420 25%, #1a2235 50%, #0d1420 75%); background-size: 200% 100%; animation: mv-shimmer 1.4s ease infinite; }
`;

const rowStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
  ::-webkit-scrollbar { height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1a2235; border-radius: 4px; }
`;

const gridStyles = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
  gap: 20,
};