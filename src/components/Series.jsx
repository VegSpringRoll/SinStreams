import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MediaCard from './MediaCard';
import HeroSlider from './HeroSlider';
import { getShows, getShowsByGenre } from '../../services/mediaService';
import {
  Tv, ChevronRight, ChevronLeft, TrendingUp, Drama, Laugh, Swords, Orbit,
  Fingerprint, Search, Sparkles, Users, Camera, Shuffle
} from 'lucide-react';

const FEATURED_GENRES = [
  { name: 'Trending Now',      icon: TrendingUp },
  { name: 'Drama',              icon: Drama,       tmdbId: 18 },
  { name: 'Comedy',             icon: Laugh,      tmdbId: 35 },
  { name: 'Action & Adventure', icon: Swords,     tmdbId: 10759 },
  { name: 'Sci-Fi & Fantasy',   icon: Orbit,      tmdbId: 10765 },
  { name: 'Crime',              icon: Fingerprint,tmdbId: 80 },
  { name: 'Mystery',            icon: Search,     tmdbId: 9648 },
  { name: 'Animation',          icon: Sparkles,   tmdbId: 16 },
  { name: 'Family',             icon: Users,      tmdbId: 10751 },
  { name: 'Documentary',        icon: Camera,     tmdbId: 99 },
];

// ── Randomizer — "Surprise Me" hero section in Pure Monochrome Glassmorphism ──
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
          <div className="sr-randomizer-placeholder"><Tv size={26} color="#ffffff" /></div>
        )}
      </div>

      <div className="sr-randomizer-info">
        <div className="sr-randomizer-eyebrow">
          <Shuffle size={13} color="#ffffff" />
          <span>Curator's Choice</span>
        </div>
        <h2>Surprise Me</h2>
        {!isMobile && (
          <p>{previewItem ? previewItem.title : 'Let us select an immersive television odyssey.'}</p>
        )}
        <button
          onClick={handleRandomize}
          disabled={shuffling || pool.length === 0}
          className="sr-randomizer-btn"
        >
          <Shuffle size={16} className={shuffling ? 'sr-spin' : ''} />
          {shuffling ? 'Consulting archives…' : 'Randomize Series'}
        </button>
      </div>
    </div>
  );
}

// ── SeriesRow — Pure Monochrome Horizontal Row ──
function SeriesRow({ title, shows: rowShows, icon: Icon, isFirst, onSeeAll, isMobile }) {
  const trackRef = useRef(null);

  const scrollByAmount = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.85 * dir;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <div className="sr-row" style={{ marginBottom: isFirst ? 28 : 36 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '0 16px' : '0 32px', marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {Icon && (
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            }}>
              <Icon size={14} color="#ffffff" />
            </div>
          )}
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: isMobile ? 15 : 17,
            fontWeight: 600, color: '#ffffff', margin: 0, letterSpacing: '-0.2px',
          }}>{title}</h2>
        </div>
        <button
          onClick={() => onSeeAll(title)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12.5,
            color: '#a1a1aa', fontWeight: 500, padding: 0, transition: 'color 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
          onMouseLeave={e => e.currentTarget.style.color = '#a1a1aa'}
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
            <ChevronLeft size={22} color="#ffffff" />
          </button>
        )}

        <div
          ref={trackRef}
          style={{
            display: 'flex', gap: isMobile ? 10 : 14, overflowX: 'auto',
            padding: isMobile ? '4px 16px 10px' : '4px 32px 14px',
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
            <ChevronRight size={22} color="#ffffff" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Series() {
  const navigate = useNavigate();
  const [trendingShows, setTrendingShows] = useState([]);
  const [genrePools,    setGenrePools]    = useState({});
  const [loading,       setLoading]       = useState(true);
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
    let cancelled = false;

    const loadAll = async () => {
      const trendingPromise = getShows().then(data =>
        Array.isArray(data) ? data.filter(s => s.type === 'series' || s.type === 'tv' || !s.type) : []
      );

      const genreEntries = FEATURED_GENRES.filter(g => g.tmdbId);
      const genrePromises = genreEntries.map(g =>
        getShowsByGenre(g.tmdbId).then(data => [g.name, Array.isArray(data) ? data : []])
      );

      const [trending, genreResults] = await Promise.all([
        trendingPromise,
        Promise.all(genrePromises),
      ]);

      if (cancelled) return;
      setTrendingShows(trending);
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
    [...trendingShows].sort((a, b) => {
      const ra = typeof a.rating === 'object' ? a.rating.percentage / 10 : (a.rating || 0);
      const rb = typeof b.rating === 'object' ? b.rating.percentage / 10 : (b.rating || 0);
      return rb - ra;
    }).slice(0, 20), [trendingShows]);

  const genreShows = useMemo(() => ({
    'Trending Now': trendingSorted,
    ...genrePools,
  }), [trendingSorted, genrePools]);

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
    <div style={{ background: '#030304', minHeight: '100vh', paddingTop: 80 }}>
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
      <div style={{ background: '#030304', minHeight: '100vh', paddingTop: 80 }}>
        <style>{CSS}</style>
        <div style={{ padding: isMobile ? '24px 16px 0' : '32px 32px 0' }}>
          <button onClick={handleBack} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14,
            color: '#a1a1aa', marginBottom: 24, padding: 0,
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
          onMouseLeave={e => e.currentTarget.style.color = '#a1a1aa'}
          >
            <ChevronLeft size={16} /> Back to Series
          </button>
          <h1 style={{ fontFamily: "'Cinzel', 'Playfair Display', serif",
            fontSize: 'clamp(26px, 3vw, 42px)', fontWeight: 900,
            color: '#ffffff', margin: '0 0 6px' }}>{activeGenre}</h1>
          <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#71717a', fontSize: 13, marginBottom: 28 }}>
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
    <div style={{ background: '#030304', minHeight: '100vh', paddingTop: trendingSorted.length > 0 ? 0 : 70, overflowX: 'hidden' }}>
      <style>{CSS}</style>

      {/* Featured Hero Cover Slider (just like in home page) */}
      {trendingSorted.length > 0 && (
        <HeroSlider slides={trendingSorted.slice(0, 5)} autoPlay={true} />
      )}

      {/* Header */}
      <div style={{
        padding: isMobile ? '28px 16px 18px' : '40px 32px 24px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)', marginBottom: 8,
      }}>
        <h1 style={{
          fontFamily: "'Cinzel', 'Playfair Display', serif",
          fontSize: isMobile ? 32 : 'clamp(32px, 4vw, 48px)', fontWeight: 900,
          color: '#ffffff', margin: 0, letterSpacing: '-0.5px',
        }}>Series</h1>
        <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: "#71717a", marginTop: 4 }}>
          Compelling serialized narratives and television series
        </p>
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
  @keyframes sr-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  .sr-sk {
    background: linear-gradient(90deg, #09090d 25%, #181822 50%, #09090d 75%);
    background-size: 200% 100%;
    animation: sr-shimmer 1.4s ease infinite;
  }

  @media (hover: hover) and (pointer: fine) {
    .sr-card {
      transition: transform 0.28s cubic-bezier(0.25, 0.8, 0.25, 1);
      transform-origin: center center;
    }
    .sr-card:hover {
      transform: scale(1.06);
      z-index: 5;
      position: relative;
    }
  }

  /* Row scroll arrows */
  .sr-arrow {
    position: absolute; top: 0; bottom: 14px;
    width: 48px; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(90deg, rgba(3,3,4,0.95) 20%, transparent);
    border: none; color: #ffffff; cursor: pointer;
    opacity: 0; transition: opacity 0.2s ease;
    z-index: 6;
  }
  .sr-arrow-r { right: 0; background: linear-gradient(270deg, rgba(3,3,4,0.95) 20%, transparent); }
  .sr-arrow-l { left: 0; }
  .sr-row:hover .sr-arrow { opacity: 1; }

  /* ── Randomizer ── */
  .sr-randomizer {
    display: flex;
    align-items: center;
    gap: 24px;
    margin: 16px 32px 36px;
    padding: 24px;
    border-radius: 18px;
    background: rgba(16, 16, 22, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.14);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  }
  .sr-randomizer-preview {
    width: 96px; height: 140px; border-radius: 12px; overflow: hidden; flex-shrink: 0;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.16);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  }
  .sr-randomizer-preview img { width: 100%; height: 100%; object-fit: cover; transition: opacity 0.08s ease; }
  .sr-randomizer-placeholder { color: #a1a1aa; }
  .sr-randomizer-info { flex: 1; min-width: 0; }
  .sr-randomizer-eyebrow {
    display: flex; align-items: center; gap: 7px;
    font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 600;
    color: #ffffff; text-transform: uppercase; letter-spacing: 0.1em;
    margin-bottom: 5px;
  }
  .sr-randomizer-info h2 {
    font-family: 'Cinzel', serif; font-size: 24px; font-weight: 900;
    color: #ffffff; margin: 0 0 6px;
  }
  .sr-randomizer-info p {
    font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13.5px; color: #a1a1aa;
    margin: 0 0 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .sr-randomizer-btn {
    display: flex; align-items: center; gap: 9px;
    background: #ffffff; color: #030304; border: none; border-radius: 10px;
    padding: 12px 24px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 700;
    cursor: pointer; transition: all 0.2s ease;
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.25);
  }
  .sr-randomizer-btn:hover:not(:disabled) { 
    transform: translateY(-2px); 
    box-shadow: 0 0 28px rgba(255, 255, 255, 0.45); 
  }
  .sr-randomizer-btn:disabled { opacity: 0.5; cursor: default; }
  @keyframes sr-spin { to { transform: rotate(360deg); } }
  .sr-spin { animation: sr-spin 0.6s linear infinite; }
  .sr-shuffling { opacity: 0.5; }

  @media (max-width: 768px) {
    .sr-randomizer { margin: 8px 16px 28px; padding: 18px; gap: 16px; }
    .sr-randomizer-preview { width: 72px; height: 105px; }
    .sr-randomizer-info h2 { font-size: 19px; }
    .sr-randomizer-btn { padding: 11px 18px; font-size: 13.5px; width: 100%; justify-content: center; }
  }

  @media (max-width: 420px) {
    .sr-randomizer { flex-direction: column; align-items: stretch; }
    .sr-randomizer-preview { width: 100%; height: 150px; }
  }
`;
