import { useState, useEffect, useMemo } from 'react';
import MediaCard from './MediaCard';
import { getMovies } from '../../services/mediaService';
import { Film, Search, ChevronRight, ChevronLeft, TrendingUp, Zap } from 'lucide-react';

const ACCENT      = '#e8b84b';
const ACCENT_DIM  = 'rgba(232,184,75,0.1)';
const ACCENT_GLOW = 'rgba(232,184,75,0.2)';

const FEATURED_GENRES = [
  { name: 'Trending Now',   icon: TrendingUp, gradient: 'linear-gradient(135deg, #e8b84b, #e05fa0)' },
  { name: 'Action',         icon: Zap,        gradient: 'linear-gradient(135deg, #ff4444, #cc0000)' },
  { name: 'Comedy',                           gradient: 'linear-gradient(135deg, #ff9800, #f57c00)' },
  { name: 'Science Fiction',                  gradient: 'linear-gradient(135deg, #4fc3f7, #0288d1)' },
  { name: 'Horror',                           gradient: 'linear-gradient(135deg, #7b1fa2, #4a0072)' },
  { name: 'Romance',                          gradient: 'linear-gradient(135deg, #ec407a, #c2185b)' },
  { name: 'Drama',                            gradient: 'linear-gradient(135deg, #5c6bc0, #283593)' },
  { name: 'Thriller',                         gradient: 'linear-gradient(135deg, #26a69a, #00695c)' },
  { name: 'Animation',                        gradient: 'linear-gradient(135deg, #ff7043, #e64a19)' },
  { name: 'Adventure',                        gradient: 'linear-gradient(135deg, #66bb6a, #2e7d32)' },
];

// ── MovieRow — defined OUTSIDE parent to prevent remount on every render ──────
function MovieRow({ title, movies: rowMovies, gradient, icon: Icon, isFirst, onSeeAll, isMobile }) {
  return (
    <div style={{ marginBottom: isFirst ? 36 : 44 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '0 16px' : '0 32px', marginBottom: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {Icon && (
            <div style={{
              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
              background: gradient || ACCENT_DIM,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={14} color="#fff" />
            </div>
          )}
          <h2 style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: isMobile ? 15 : 17,
            fontWeight: 700, color: '#e8eaf0', margin: 0, letterSpacing: '-0.2px',
          }}>{title}</h2>
          <span style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#3a4560', fontWeight: 500,
          }}>{rowMovies.length}</span>
        </div>
        <button
          onClick={() => onSeeAll(title)}
          style={{
            display: 'flex', alignItems: 'center', gap: 3,
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif", fontSize: 12,
            color: '#6878a0', fontWeight: 500, padding: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.color = ACCENT}
          onMouseLeave={e => e.currentTarget.style.color = '#6878a0'}
        >
          See All <ChevronRight size={13} />
        </button>
      </div>

      <div style={{
        display: 'flex', gap: isMobile ? 10 : 14, overflowX: 'auto',
        padding: isMobile ? '4px 16px 10px' : '4px 32px 12px',
        scrollbarWidth: 'none', scrollSnapType: 'x mandatory',
      }}>
        {rowMovies.map((movie, i) => (
          <div key={movie._id || i} style={{ flexShrink: 0, scrollSnapAlign: 'start' }}>
            <MediaCard media={movie} type="movie" index={i} size={isMobile ? 'sm' : 'md'} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Movies() {
  const [movies,        setMovies]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showAll,       setShowAll]       = useState(false);
  const [activeGenre,   setActiveGenre]   = useState(null);
  const [isMobile,      setIsMobile]      = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    getMovies()
      .then(data => setMovies(Array.isArray(data) ? data.filter(m => !m.type || m.type === 'movie') : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const genreMovies = useMemo(() => {
    const groups = {};
    FEATURED_GENRES.forEach(({ name }) => {
      if (name === 'Trending Now') {
        groups[name] = [...movies]
          .sort((a, b) => {
            const ra = typeof a.rating === 'object' ? a.rating.percentage / 10 : (a.rating || 0);
            const rb = typeof b.rating === 'object' ? b.rating.percentage / 10 : (b.rating || 0);
            return rb - ra;
          })
          .slice(0, 20);
      } else {
        groups[name] = movies
          .filter(m => (m.genres || []).some(g => typeof g === 'string' && g.toLowerCase() === name.toLowerCase()))
          .slice(0, 20);
      }
    });
    return groups;
  }, [movies]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return movies
      .filter(m =>
        m.title?.toLowerCase().includes(q) ||
        (m.genres || []).some(g => typeof g === 'string' && g.toLowerCase().includes(q))
      )
      .slice(0, 40);
  }, [movies, search]);

  const allMoviesSorted = useMemo(() =>
    [...movies].sort((a, b) => {
      const ra = typeof a.rating === 'object' ? a.rating.percentage / 10 : (a.rating || 0);
      const rb = typeof b.rating === 'object' ? b.rating.percentage / 10 : (b.rating || 0);
      return rb - ra;
    }), [movies]);

  const handleSeeAll = (genre) => { setActiveGenre(genre); setShowAll(true); };
  const handleBack   = ()      => { setShowAll(false); setActiveGenre(null); };

  const px = isMobile ? '0 16px' : '0 32px';

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ background: '#080c14', minHeight: '100vh', paddingTop: 80 }}>
      <style>{CSS}</style>
      <div style={{ padding: isMobile ? '24px 16px 0' : '32px 32px 0' }}>
        <div className="mv-sk" style={{ width: 180, height: 36, borderRadius: 8, marginBottom: 36 }} />
        {[1,2,3,4].map(r => (
          <div key={r} style={{ marginBottom: 44 }}>
            <div className="mv-sk" style={{ width: 140, height: 18, borderRadius: 6, marginBottom: 14 }} />
            <div style={{ display: 'flex', gap: 14, overflow: 'hidden' }}>
              {[1,2,3,4,5,6,7].map(i => (
                <div key={i} className="mv-sk" style={{ width: isMobile ? 130 : 160, height: isMobile ? 190 : 235, flexShrink: 0, borderRadius: 10 }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── See All View ──────────────────────────────────────────────────────────
  if (showAll && activeGenre) {
    const displayMovies = activeGenre === 'Trending Now'
      ? allMoviesSorted
      : movies.filter(m => (m.genres || []).some(g => typeof g === 'string' && g.toLowerCase() === activeGenre.toLowerCase()));

    return (
      <div style={{ background: '#080c14', minHeight: '100vh', paddingTop: 80 }}>
        <style>{CSS}</style>
        <div style={{ padding: isMobile ? '24px 16px 0' : '32px 32px 0' }}>
          <button onClick={handleBack} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif", fontSize: 14,
            color: '#6878a0', marginBottom: 24, padding: 0,
          }}>
            <ChevronLeft size={16} /> Back to Movies
          </button>
          <h1 style={{ fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(26px, 3vw, 42px)', fontWeight: 900,
            color: '#e8eaf0', margin: '0 0 6px' }}>{activeGenre}</h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#3a4560', fontSize: 13, marginBottom: 28 }}>
            {displayMovies.length} movies
          </p>
          <div style={gridStyle}>
            {displayMovies.map((movie, i) => (
              <MediaCard key={movie._id || i} media={movie} type="movie" index={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Main Layout ───────────────────────────────────────────────────────────
  return (
    <div style={{ background: '#080c14', minHeight: '100vh', paddingTop: 80 }}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{
        padding: isMobile ? '24px 16px 20px' : '36px 32px 28px',
        borderBottom: '1px solid rgba(255,255,255,0.04)', marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Film size={16} color={ACCENT} strokeWidth={1.5} />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600,
                color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Collection</span>
            </div>
            <h1 style={{ fontFamily: "'Playfair Display', serif",
              fontSize: isMobile ? 34 : 'clamp(32px, 4vw, 48px)', fontWeight: 900,
              color: '#e8eaf0', margin: 0, letterSpacing: '-1px' }}>Movies</h1>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: ACCENT }}>{movies.length}</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#3a4560', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total</div>
          </div>
        </div>

        {/* Search */}
        <div style={{ marginTop: 20 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            maxWidth: isMobile ? '100%' : 460,
            background: searchFocused ? 'rgba(232,184,75,0.05)' : '#0d1420',
            border: `1px solid ${searchFocused ? `${ACCENT}44` : 'rgba(255,255,255,0.07)'}`,
            borderRadius: 10, padding: '0 14px', transition: 'all 0.2s',
            boxShadow: searchFocused ? `0 0 0 3px ${ACCENT_GLOW}` : 'none',
          }}>
            <Search size={14} color={searchFocused ? ACCENT : '#3a4560'} style={{ flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search movies by title or genre..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none',
                fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#c8d0e0', padding: '12px 0' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#4a5570', fontSize: 16, lineHeight: 1, padding: 0,
              }}>✕</button>
            )}
          </div>
        </div>
      </div>

      {/* Search Results */}
      {search && (
        <div style={{ padding: isMobile ? '24px 16px 40px' : '24px 32px 40px' }}>
          {searchResults.length > 0 ? (
            <>
              <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 700,
                color: '#e8eaf0', marginBottom: 16, marginTop: 0 }}>
                Results for "{search}" — {searchResults.length} found
              </h2>
              <div style={gridStyle}>
                {searchResults.map((movie, i) => (
                  <MediaCard key={movie._id || i} media={movie} type="movie" index={i} />
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>🎬</div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#4a5570', fontSize: 16, margin: '0 0 6px' }}>
                No movies found for "{search}"
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#2a3550', fontSize: 13 }}>
                Try a different title or genre
              </p>
            </div>
          )}
        </div>
      )}

      {/* Genre Rows */}
      {!search && (
        <div style={{ paddingBottom: 60 }}>
          {FEATURED_GENRES.map((genre, index) => {
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
                onSeeAll={handleSeeAll}
                isMobile={isMobile}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
  gap: 16,
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
  @keyframes mv-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  .mv-sk {
    background: linear-gradient(90deg, #0d1420 25%, #1a2235 50%, #0d1420 75%);
    background-size: 200% 100%;
    animation: mv-shimmer 1.4s ease infinite;
  }
  ::-webkit-scrollbar { height: 3px; width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1a2235; border-radius: 4px; }
`;