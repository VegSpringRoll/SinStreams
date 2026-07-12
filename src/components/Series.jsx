import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MediaCard from './MediaCard';
import { getShows, getShowsByGenre } from '../../services/mediaService';
import {
  Tv, ChevronRight, ChevronLeft, TrendingUp, Drama, Laugh, Swords, Orbit,
  Fingerprint, Search, Sparkles, Users, Camera, Shuffle
} from 'lucide-react';

const ACCENT      = '#5ba4d4';
const ACCENT_DIM  = 'rgba(91,164,212,0.1)';

// tmdbId is TMDB's official TV genre id — used to pull a full, dedicated list
// for that genre from the backend, instead of filtering the small trending pool.
const FEATURED_GENRES = [
  { name: 'Trending Now',      icon: TrendingUp,  gradient: 'linear-gradient(135deg, #5ba4d4, #e05fa0)' },
  { name: 'Drama',              icon: Drama,       gradient: 'linear-gradient(135deg, #5c6bc0, #283593)', tmdbId: 18 },
  { name: 'Comedy',             icon: Laugh,       gradient: 'linear-gradient(135deg, #ff9800, #f57c00)', tmdbId: 35 },
  { name: 'Action & Adventure', icon: Swords,      gradient: 'linear-gradient(135deg, #ff4444, #cc0000)', tmdbId: 10759 },
  { name: 'Sci-Fi & Fantasy',   icon: Orbit,       gradient: 'linear-gradient(135deg, #4fc3f7, #0288d1)', tmdbId: 10765 },
  { name: 'Crime',              icon: Fingerprint, gradient: 'linear-gradient(135deg, #7b1fa2, #4a0072)', tmdbId: 80 },
  { name: 'Mystery',            icon: Search,      gradient: 'linear-gradient(135deg, #26a69a, #00695c)', tmdbId: 9648 },
  { name: 'Animation',          icon: Sparkles,    gradient: 'linear-gradient(135deg, #ff7043, #e64a19)', tmdbId: 16 },
  { name: 'Family',             icon: Users,       gradient: 'linear-gradient(135deg, #66bb6a, #2e7d32)', tmdbId: 10751 },
  { name: 'Documentary',        icon: Camera,      gradient: 'linear-gradient(135deg, #8d6e63, #4e342e)', tmdbId: 99 },
];

// ── Randomizer — "Surprise Me" hero section with a slot-machine style shuffle ──
function Randomizer({ pool, isMobile, navigate }) {
  const [previewItem, setPreviewItem] = useState(null);
  const [shuffling, setShuffling] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!previewItem && pool.length > 0) {
      setPreviewItem(pool[Math.floor(Math.random() * pool.length)]);
    }
  }, [pool, previewItem]);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const handleRandomize = () => {
    if (shuffling || pool.length === 0) return;
    setShuffling(true);

    let ticks = 0;
    const maxTicks = 12;
    intervalRef.current = setInterval(() => {
      ticks += 1;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      setPreviewItem(pick);

      if (ticks >= maxTicks) {
        clearInterval(intervalRef.current);
        setShuffling(false);
        // Adjust this path if your router uses a different details route.
        navigate(`/details/series/${pick._id}`);
      }
    }, 85);
  };

  return (
    <div className="sr-randomizer">
      <div className="sr-randomizer-preview">
        {previewItem?.images?.poster ? (
          <img
            src={previewItem.images.poster}
            alt=""
            className={shuffling ? 'sr-shuffling' : ''}
          />
        ) : (
          <div className="sr-randomizer-placeholder"><Tv size={26} /></div>
        )}
      </div>

      <div className="sr-randomizer-info">
        <div className="sr-randomizer-eyebrow">
          <Shuffle size={13} />
          <span>Can't decide?</span>
        </div>
        <h2>Surprise Me</h2>
        {!isMobile && (
          <p>{previewItem ? previewItem.title : 'Let us pick something great for you to watch.'}</p>
        )}
        <button
          onClick={handleRandomize}
          disabled={shuffling || pool.length === 0}
          className="sr-randomizer-btn"
        >
          <Shuffle size={16} className={shuffling ? 'sr-spin' : ''} />
          {shuffling ? 'Shuffling…' : 'Randomize'}
        </button>
      </div>
    </div>
  );
}

// ── SeriesRow — Netflix-style horizontal row with hover-zoom + scroll arrows ──
function SeriesRow({ title, shows: rowShows, gradient, icon: Icon, isFirst, onSeeAll, isMobile }) {
  const trackRef = useRef(null);

  const scrollByAmount = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.85 * dir;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <div className="sr-row" style={{ marginBottom: isFirst ? 30 : 38 }}>
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

      <div className="sr-row-wrap" style={{ position: 'relative' }}>
        {!isMobile && (
          <button
            aria-label="Scroll left"
            className="sr-arrow sr-arrow-l"
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
          {rowShows.map((show, i) => (
            <div key={show._id || i} className="sr-card" style={{ flexShrink: 0, scrollSnapAlign: 'start' }}>
              <MediaCard media={show} type="series" index={i} size={isMobile ? 'sm' : 'md'} />
            </div>
          ))}
        </div>

        {!isMobile && (
          <button
            aria-label="Scroll right"
            className="sr-arrow sr-arrow-r"
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
export default function Series() {
  const navigate = useNavigate();
  const [trendingSeries, setTrendingSeries] = useState([]);
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
      const trendingPromise = getShows().then(data => Array.isArray(data) ? data : []);

      // Each genre gets its own dedicated pool, fetched in parallel
      const genreEntries = FEATURED_GENRES.filter(g => g.tmdbId);
      const genrePromises = genreEntries.map(g =>
        getShowsByGenre(g.tmdbId).then(data => [g.name, Array.isArray(data) ? data : []])
      );

      const [trending, genreResults] = await Promise.all([
        trendingPromise,
        Promise.all(genrePromises),
      ]);

      if (cancelled) return;
      setTrendingSeries(trending);
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
    [...trendingSeries].sort((a, b) => {
      const ra = typeof a.rating === 'object' ? a.rating.percentage / 10 : (a.rating || 0);
      const rb = typeof b.rating === 'object' ? b.rating.percentage / 10 : (b.rating || 0);
      return rb - ra;
    }).slice(0, 20), [trendingSeries]);

  const genreShows = useMemo(() => ({
    'Trending Now': trendingSorted,
    ...genrePools,
  }), [trendingSorted, genrePools]);

  // Deduplicated pool of every show loaded across all rows, used by the randomizer.
  const allShowsPool = useMemo(() => {
    const map = new Map();
    [...trendingSorted, ...Object.values(genrePools).flat()].forEach(s => {
      if (s && s._id) map.set(s._id, s);
    });
    return Array.from(map.values());
  }, [trendingSorted, genrePools]);

  const handleSeeAll = (genre) => { setActiveGenre(genre); setShowAll(true); };
  const handleBack   = ()      => { setShowAll(false); setActiveGenre(null); };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ background: '#080c14', minHeight: '100vh', paddingTop: 80 }}>
      <style>{CSS}</style>
      <div style={{ padding: isMobile ? '24px 16px 0' : '32px 32px 0' }}>
        <div className="sr-sk" style={{ width: 180, height: 36, borderRadius: 8, marginBottom: 36 }} />
        {[1,2,3,4].map(r => (
          <div key={r} style={{ marginBottom: 44 }}>
            <div className="sr-sk" style={{ width: 140, height: 18, borderRadius: 6, marginBottom: 14 }} />
            <div style={{ display: 'flex', gap: 14, overflow: 'hidden' }}>
              {[1,2,3,4,5,6,7].map(i => (
                <div key={i} className="sr-sk" style={{ width: isMobile ? 130 : 160, height: isMobile ? 190 : 235, flexShrink: 0, borderRadius: 10 }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── See All View ──────────────────────────────────────────────────────────
  if (showAll && activeGenre) {
    const displayShows = genreShows[activeGenre] || [];

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
            <ChevronLeft size={16} /> Back to Series
          </button>
          <h1 style={{ fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(26px, 3vw, 42px)', fontWeight: 900,
            color: '#e8eaf0', margin: '0 0 6px' }}>{activeGenre}</h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", color: '#3a4560', fontSize: 13, marginBottom: 28 }}>
            {displayShows.length} series
          </p>
          <div style={gridStyle}>
            {displayShows.map((show, i) => (
              <MediaCard key={show._id || i} media={show} type="series" index={i} />
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
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: isMobile ? 34 : 'clamp(32px, 4vw, 48px)', fontWeight: 900,
          color: '#e8eaf0', margin: 0, letterSpacing: '-1px',
        }}>Series</h1>
      </div>

      {/* Randomizer */}
      <Randomizer pool={allShowsPool} isMobile={isMobile} navigate={navigate} />

      {/* Genre Rows */}
      <div style={{ paddingBottom: 60 }}>
        {FEATURED_GENRES.map((genre, index) => {
          const rowShows = genreShows[genre.name] || [];
          if (rowShows.length === 0) return null;
          return (
            <SeriesRow
              key={genre.name}
              title={genre.name}
              shows={rowShows}
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
  @keyframes sr-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  .sr-sk {
    background: linear-gradient(90deg, #0d1420 25%, #1a2235 50%, #0d1420 75%);
    background-size: 200% 100%;
    animation: sr-shimmer 1.4s ease infinite;
  }

  /* Netflix-style hover zoom on cards (desktop only, mouse-capable) */
  @media (hover: hover) and (pointer: fine) {
    .sr-card {
      transition: transform 0.28s cubic-bezier(0.25, 0.8, 0.25, 1);
      transform-origin: center center;
    }
    .sr-card:hover {
      transform: scale(1.08);
      z-index: 5;
      position: relative;
    }
  }

  /* Row scroll arrows */
  .sr-arrow {
    position: absolute; top: 0; bottom: 12px;
    width: 44px; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(90deg, #080c14 10%, transparent);
    border: none; color: #e8eaf0; cursor: pointer;
    opacity: 0; transition: opacity 0.2s ease;
    z-index: 6;
  }
  .sr-arrow-r { right: 0; background: linear-gradient(270deg, #080c14 10%, transparent); }
  .sr-arrow-l { left: 0; }
  .sr-row:hover .sr-arrow { opacity: 1; }

  ::-webkit-scrollbar { height: 3px; width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1a2235; border-radius: 4px; }

  /* ── Randomizer ── */
  .sr-randomizer {
    display: flex;
    align-items: center;
    gap: 24px;
    margin: 8px 32px 40px;
    padding: 20px;
    border-radius: 16px;
    background: linear-gradient(135deg, rgba(91,164,212,0.09), rgba(224,95,160,0.06));
    border: 1px solid rgba(91,164,212,0.18);
  }
  .sr-randomizer-preview {
    width: 90px; height: 130px; border-radius: 10px; overflow: hidden; flex-shrink: 0;
    background: rgba(255,255,255,0.04);
    display: flex; align-items: center; justify-content: center;
  }
  .sr-randomizer-preview img { width: 100%; height: 100%; object-fit: cover; transition: opacity 0.08s ease; }
  .sr-randomizer-placeholder { color: #3a4560; }
  .sr-randomizer-info { flex: 1; min-width: 0; }
  .sr-randomizer-eyebrow {
    display: flex; align-items: center; gap: 6px;
    font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 600;
    color: #5ba4d4; text-transform: uppercase; letter-spacing: 0.1em;
    margin-bottom: 4px;
  }
  .sr-randomizer-info h2 {
    font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 900;
    color: #e8eaf0; margin: 0 0 4px;
  }
  .sr-randomizer-info p {
    font-family: 'DM Sans', sans-serif; font-size: 13px; color: #6878a0;
    margin: 0 0 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .sr-randomizer-btn {
    display: flex; align-items: center; gap: 8px;
    background: #5ba4d4; color: #080c14; border: none; border-radius: 8px;
    padding: 11px 22px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 700;
    cursor: pointer; transition: transform 0.15s ease, opacity 0.15s ease;
  }
  .sr-randomizer-btn:hover:not(:disabled) { transform: translateY(-1px); }
  .sr-randomizer-btn:disabled { opacity: 0.5; cursor: default; }
  @keyframes sr-spin { to { transform: rotate(360deg); } }
  .sr-spin { animation: sr-spin 0.6s linear infinite; }
  .sr-shuffling { opacity: 0.55; }

  @media (max-width: 768px) {
    .sr-randomizer { margin: 4px 16px 28px; padding: 16px; gap: 16px; }
    .sr-randomizer-preview { width: 66px; height: 96px; }
    .sr-randomizer-info h2 { font-size: 18px; }
    .sr-randomizer-btn { padding: 10px 16px; font-size: 13px; width: 100%; justify-content: center; }
  }

  @media (max-width: 420px) {
    .sr-randomizer { flex-direction: column; align-items: stretch; }
    .sr-randomizer-preview { width: 100%; height: 150px; }
  }
`;