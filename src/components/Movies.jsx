import { useState, useEffect, useMemo, useRef } from 'react';
import MediaCard from './MediaCard';
import { getMovies, getMoviesByGenre } from '../../services/mediaService';
import { Film, ChevronRight, ChevronLeft, TrendingUp, Zap } from 'lucide-react';

const ACCENT      = '#e8b84b';
const ACCENT_DIM  = 'rgba(232,184,75,0.1)';

// tmdbId is TMDB's official genre id — used to pull a full, dedicated list
// for that genre from the backend, instead of filtering the small trending pool.
const FEATURED_GENRES = [
  { name: 'Trending Now',   icon: TrendingUp, gradient: 'linear-gradient(135deg, #e8b84b, #e05fa0)' },
  { name: 'Action',         icon: Zap,        gradient: 'linear-gradient(135deg, #ff4444, #cc0000)', tmdbId: 28 },
  { name: 'Comedy',                           gradient: 'linear-gradient(135deg, #ff9800, #f57c00)', tmdbId: 35 },
  { name: 'Science Fiction',                  gradient: 'linear-gradient(135deg, #4fc3f7, #0288d1)', tmdbId: 878 },
  { name: 'Horror',                           gradient: 'linear-gradient(135deg, #7b1fa2, #4a0072)', tmdbId: 27 },
  { name: 'Romance',                          gradient: 'linear-gradient(135deg, #ec407a, #c2185b)', tmdbId: 10749 },
  { name: 'Drama',                            gradient: 'linear-gradient(135deg, #5c6bc0, #283593)', tmdbId: 18 },
  { name: 'Thriller',                         gradient: 'linear-gradient(135deg, #26a69a, #00695c)', tmdbId: 53 },
  { name: 'Animation',                        gradient: 'linear-gradient(135deg, #ff7043, #e64a19)', tmdbId: 16 },
  { name: 'Adventure',                        gradient: 'linear-gradient(135deg, #66bb6a, #2e7d32)', tmdbId: 12 },
];

// ── MovieRow — Netflix-style horizontal row with hover-zoom + scroll arrows ───
function MovieRow({ title, movies: rowMovies, gradient, icon: Icon, isFirst, onSeeAll, isMobile }) {
  const trackRef = useRef(null);

  const scrollByAmount = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.85 * dir;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <div className="mv-row" style={{ marginBottom: isFirst ? 30 : 38 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '0 16px' : '0 32px', marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {Icon && (
            <div style={{
              width: 26, height: 26, borderRadius: 7, flexShrink: 0,
              background: gradient || ACCENT_DIM,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={13} color="#fff" />
            </div>
          )}
          <h2 style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: isMobile ? 15 : 17,
            fontWeight: 700, color: '#e8eaf0', margin: 0, letterSpacing: '-0.2px',
          }}>{title}</h2>
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

      <div className="mv-row-wrap" style={{ position: 'relative' }}>
        {!isMobile && (
          <button
            aria-label="Scroll left"
            className="mv-arrow mv-arrow-l"
            onClick={() => scrollByAmount(-1)}
          >
            <ChevronLeft size={22} />
          </button>
        )}

        <div
          ref={trackRef}
          style={{
            display: 'flex', gap: isMobile ? 10 : 12, overflowX: 'auto',
            padding: isMobile ? '4px 16px 10px' : '4px 32px 12px',
            scrollbarWidth: 'none', scrollSnapType: 'x mandatory',
          }}
        >
          {rowMovies.map((movie, i) => (
            <div key={movie._id || i} className="mv-card" style={{ flexShrink: 0, scrollSnapAlign: 'start' }}>
              <MediaCard media={movie} type="movie" index={i} size={isMobile ? 'sm' : 'md'} />
            </div>
          ))}
        </div>

        {!isMobile && (
          <button
            aria-label="Scroll right"
            className="mv-arrow mv-arrow-r"
            onClick={() => scrollByAmount(1)}
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Movies() {
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [genrePools,     setGenrePools]     = useState({});
  const [loading,        setLoading]        = useState(true);
  const [showAll,        setShowAll]        = useState(false);
  const [activeGenre,    setActiveGenre]    = useState(null);
  const [isMobile,       setIsMobile]       = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadAll = async () => {
      // Trending row + total count
      const trendingPromise = getMovies().then(data =>
        Array.isArray(data) ? data.filter(m => !m.type || m.type === 'movie') : []
      );

      // Each genre gets its own dedicated pool, fetched in parallel
      const genreEntries = FEATURED_GENRES.filter(g => g.tmdbId);
      const genrePromises = genreEntries.map(g =>
        getMoviesByGenre(g.tmdbId).then(data => [g.name, Array.isArray(data) ? data : []])
      );

      const [trending, genreResults] = await Promise.all([
        trendingPromise,
        Promise.all(genrePromises),
      ]);

      if (cancelled) return;
      setTrendingMovies(trending);
      setGenrePools(Object.fromEntries(genreResults));
      setLoading(false);
    };

    loadAll().catch(err => {
      console.error(err);
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, []);

  const trendingSorted = useMemo(() =>
    [...trendingMovies].sort((a, b) => {
      const ra = typeof a.rating === 'object' ? a.rating.percentage / 10 : (a.rating || 0);
      const rb = typeof b.rating === 'object' ? b.rating.percentage / 10 : (b.rating || 0);
      return rb - ra;
    }).slice(0, 20), [trendingMovies]);

  const genreMovies = useMemo(() => ({
    'Trending Now': trendingSorted,
    ...genrePools,
  }), [trendingSorted, genrePools]);

  const handleSeeAll = (genre) => { setActiveGenre(genre); setShowAll(true); };
  const handleBack   = ()      => { setShowAll(false); setActiveGenre(null); };

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
    const displayMovies = genreMovies[activeGenre] || [];

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
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: ACCENT }}>{trendingMovies.length}</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#3a4560', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total</div>
          </div>
        </div>
      </div>

      {/* Genre Rows */}
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

  /* Netflix-style hover zoom on cards (desktop only, mouse-capable) */
  @media (hover: hover) and (pointer: fine) {
    .mv-card {
      transition: transform 0.28s cubic-bezier(0.25, 0.8, 0.25, 1);
      transform-origin: center center;
    }
    .mv-card:hover {
      transform: scale(1.08);
      z-index: 5;
      position: relative;
    }
  }

  /* Row scroll arrows */
  .mv-arrow {
    position: absolute; top: 0; bottom: 12px;
    width: 44px; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(90deg, #080c14 10%, transparent);
    border: none; color: #e8eaf0; cursor: pointer;
    opacity: 0; transition: opacity 0.2s ease;
    z-index: 6;
  }
  .mv-arrow-r { right: 0; background: linear-gradient(270deg, #080c14 10%, transparent); }
  .mv-arrow-l { left: 0; }
  .mv-row:hover .mv-arrow { opacity: 1; }

  ::-webkit-scrollbar { height: 3px; width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1a2235; border-radius: 4px; }
`;