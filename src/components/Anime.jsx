// src/components/Anime.jsx
// Pure Monochrome Glassmorphism Anime Catalog powered by AniList & Jikan
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MediaCard from './MediaCard';
import {
  getTrendingAnime,
  getPopularAnime,
  getTopRatedAnime,
  getAnimeByGenre,
  searchAnime
} from '../../services/animeService';
import {
  Sparkles, ChevronRight, ChevronLeft, TrendingUp, Zap, Laugh, Rocket, Ghost,
  Heart, Drama, Compass, Shuffle, Award, Tv, Search, X
} from 'lucide-react';

const ANIME_GENRES = [
  { name: 'Trending Now',      icon: TrendingUp },
  { name: 'Popular All Time',  icon: Award },
  { name: 'Action',            icon: Zap,        queryGenre: 'Action' },
  { name: 'Fantasy',           icon: Sparkles,   queryGenre: 'Fantasy' },
  { name: 'Romance',           icon: Heart,      queryGenre: 'Romance' },
  { name: 'Sci-Fi',            icon: Rocket,     queryGenre: 'Sci-Fi' },
  { name: 'Supernatural',      icon: Ghost,      queryGenre: 'Supernatural' },
  { name: 'Comedy',            icon: Laugh,      queryGenre: 'Comedy' },
  { name: 'Drama',             icon: Drama,      queryGenre: 'Drama' },
  { name: 'Adventure',         icon: Compass,    queryGenre: 'Adventure' },
];

// ── Randomizer — "Surprise Me" hero section ──
function AnimeRandomizer({ pool, isMobile, navigate }) {
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
        navigate(`/details/anime/${pick._id || pick.id}`);
      }
    }, 85);
  };

  return (
    <div className="an-randomizer">
      <div className="an-randomizer-preview">
        {previewItem?.images?.poster ? (
          <img
            src={previewItem.images.poster}
            alt=""
            className={shuffling ? 'an-shuffling' : ''}
          />
        ) : (
          <div className="an-randomizer-placeholder"><Sparkles size={26} color="#ffffff" /></div>
        )}
      </div>

      <div className="an-randomizer-info">
        <div className="an-randomizer-eyebrow">
          <Shuffle size={13} color="#ffffff" />
          <span>Curator's Choice</span>
        </div>
        <h2>Surprise Me</h2>
        {!isMobile && (
          <p>{previewItem ? previewItem.title : 'Let us select a legendary anime journey for you.'}</p>
        )}
        <button
          onClick={handleRandomize}
          disabled={shuffling || pool.length === 0}
          className="an-randomizer-btn"
        >
          <Shuffle size={16} className={shuffling ? 'an-spin' : ''} />
          {shuffling ? 'Consulting archives…' : 'Randomize Anime'}
        </button>
      </div>
    </div>
  );
}

// ── AnimeRow — Pure Monochrome Horizontal Row ──
function AnimeRow({ title, items: rowItems, icon: Icon, isFirst, onSeeAll, isMobile }) {
  const trackRef = useRef(null);

  const scrollByAmount = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.85 * dir;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <div className="an-row" style={{ marginBottom: isFirst ? 28 : 36 }}>
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
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12,
            color: '#a1a1aa', fontWeight: 600, padding: 0,
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
          onMouseLeave={e => e.currentTarget.style.color = '#a1a1aa'}
        >
          See All <ChevronRight size={13} />
        </button>
      </div>

      <div className="an-track-container" style={{ position: 'relative' }}>
        {!isMobile && (
          <button
            className="an-nav-btn an-nav-left"
            onClick={() => scrollByAmount(-1)}
            aria-label="Scroll left"
          >
            <ChevronLeft size={18} />
          </button>
        )}

        <div
          ref={trackRef}
          className="an-track hide-scrollbar"
          style={{
            display: 'flex',
            gap: isMobile ? 10 : 14,
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            padding: isMobile ? '0 16px 8px' : '0 32px 8px',
          }}
        >
          {rowItems && rowItems.length > 0 ? (
            rowItems.map((item, idx) => (
              <div key={item._id || item.id || idx} style={{ scrollSnapAlign: 'start', flexShrink: 0 }}>
                <MediaCard media={item} type="anime" size={isMobile ? 'sm' : 'md'} />
              </div>
            ))
          ) : (
            [1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="an-card-skeleton" style={{
                width: isMobile ? 130 : 160,
                height: isMobile ? 190 : 235,
                flexShrink: 0, borderRadius: 12,
              }} />
            ))
          )}
        </div>

        {!isMobile && (
          <button
            className="an-nav-btn an-nav-right"
            onClick={() => scrollByAmount(1)}
            aria-label="Scroll right"
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Anime Component ──
export default function Anime() {
  const navigate = useNavigate();

  const [trending, setTrending] = useState([]);
  const [popular, setPopular] = useState([]);
  const [genrePools, setGenrePools] = useState({});
  const [activePill, setActivePill] = useState('All');
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchAnime(searchQuery.trim(), 1, 30);
        setSearchResults(results || []);
      } catch (err) {
        console.error('Anime search failed:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);
        const [tr, pop] = await Promise.all([
          getTrendingAnime(1, 20),
          getPopularAnime(1, 20)
        ]);

        if (cancelled) return;
        setTrending(tr || []);
        setPopular(pop || []);

        // Load genre pools concurrently
        const genreList = ANIME_GENRES.filter(g => g.queryGenre);
        const results = await Promise.all(
          genreList.map(async g => {
            const items = await getAnimeByGenre(g.queryGenre, 1, 16);
            return { name: g.name, items };
          })
        );

        if (cancelled) return;
        const pools = {};
        results.forEach(r => { pools[r.name] = r.items || []; });
        setGenrePools(pools);
      } catch (err) {
        console.error('Failed to load anime catalog:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, []);

  const surprisePool = useMemo(() => {
    return trending.length > 0 ? trending : popular;
  }, [trending, popular]);

  // Filtered list when a specific pill or "See All" is selected
  const activeItems = useMemo(() => {
    if (activePill === 'All') return null;
    if (activePill === 'Trending Now') return trending;
    if (activePill === 'Popular All Time') return popular;
    return genrePools[activePill] || [];
  }, [activePill, trending, popular, genrePools]);

  return (
    <div style={{ background: '#030304', minHeight: '100vh', paddingTop: 85, paddingBottom: 60 }}>
      <style>{ANIME_CSS}</style>

      {/* Hero Header */}
      <div style={{ padding: isMobile ? '0 16px 20px' : '0 32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          <h1 style={{
            fontFamily: "'Cinzel', 'Playfair Display', serif",
            fontSize: isMobile ? 28 : 36,
            fontWeight: 900,
            color: '#ffffff',
            margin: 0,
            letterSpacing: '-0.3px',
          }}>
            Anime
          </h1>
        </div>
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          color: '#71717a', fontSize: 13, margin: 0, maxWidth: 600,
        }}>
          Explore thousands of broadcast anime, movies, OVAs, and airing masterworks streamed directly in high definition.
        </p>
      </div>

      {/* Dedicated Anime Search Bar */}
      <div className="an-search-container">
        <div className="an-search-box">
          <Search size={18} color="#a1a1aa" style={{ flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search anime by title, studio, or genre (e.g. One Piece, Jujutsu Kaisen, Demon Slayer)..."
            className="an-search-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="an-search-clear"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Render Search Results or Standard Catalog */}
      {searchQuery.trim() ? (
        <div style={{ padding: isMobile ? '0 16px' : '0 32px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 20, flexWrap: 'wrap', gap: 10,
          }}>
            <div>
              <h2 style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: isMobile ? 18 : 22, fontWeight: 700, color: '#ffffff', margin: '0 0 4px 0',
              }}>
                Search Results for "{searchQuery}"
              </h2>
              <span style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 12, color: '#71717a',
              }}>
                {isSearching ? 'Searching database...' : `${searchResults.length} anime found`}
              </span>
            </div>

            <button
              onClick={() => setSearchQuery('')}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderRadius: 20,
                padding: '6px 14px',
                color: '#a1a1aa',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#a1a1aa'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; }}
            >
              Clear Search
            </button>
          </div>

          {isSearching ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(130px, 1fr))' : 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: isMobile ? 12 : 18,
            }}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="an-card-skeleton" style={{
                  height: isMobile ? 190 : 235,
                  borderRadius: 12,
                }} />
              ))}
            </div>
          ) : searchResults.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(130px, 1fr))' : 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: isMobile ? 12 : 18,
            }}>
              {searchResults.map((item, idx) => (
                <div key={item._id || item.id || idx} style={{ display: 'flex', justifyContent: 'center' }}>
                  <MediaCard media={item} type="anime" size={isMobile ? 'sm' : 'md'} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              padding: '60px 20px',
              textAlign: 'center',
              background: 'rgba(14, 14, 18, 0.6)',
              borderRadius: 16,
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}>
              <Search size={36} color="#52525b" style={{ marginBottom: 12 }} />
              <p style={{
                color: '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 16, fontWeight: 600, margin: '0 0 6px 0',
              }}>
                No anime found for "{searchQuery}"
              </p>
              <p style={{
                color: '#71717a', fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 13, margin: 0,
              }}>
                Try checking the spelling, searching the Romaji title, or browsing categories below.
              </p>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Surprise Me Randomizer */}
          {surprisePool.length > 0 && activePill === 'All' && (
            <div style={{ padding: isMobile ? '0 16px 24px' : '0 32px 30px' }}>
              <AnimeRandomizer pool={surprisePool} isMobile={isMobile} navigate={navigate} />
            </div>
          )}

          {/* Category Filter Pills */}
          <div style={{
            display: 'flex', gap: 8,
            padding: isMobile ? '0 16px 24px' : '0 32px 28px',
            overflowX: 'auto', scrollbarWidth: 'none',
          }}>
            <button
              onClick={() => setActivePill('All')}
              style={{
                padding: '7px 16px', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap',
                fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, fontWeight: 600,
                transition: 'all 0.18s', border: '1px solid',
                background: activePill === 'All' ? '#ffffff' : 'rgba(255,255,255,0.05)',
                borderColor: activePill === 'All' ? '#ffffff' : 'rgba(255,255,255,0.12)',
                color: activePill === 'All' ? '#030304' : '#a1a1aa',
                boxShadow: activePill === 'All' ? '0 0 16px rgba(255,255,255,0.3)' : 'none',
              }}
            >
              All Categories
            </button>
            {ANIME_GENRES.map(g => {
              const isActive = activePill === g.name;
              return (
                <button
                  key={g.name}
                  onClick={() => setActivePill(g.name)}
                  style={{
                    padding: '7px 16px', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap',
                    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, fontWeight: 600,
                    transition: 'all 0.18s', border: '1px solid',
                    background: isActive ? '#ffffff' : 'rgba(255,255,255,0.05)',
                    borderColor: isActive ? '#ffffff' : 'rgba(255,255,255,0.12)',
                    color: isActive ? '#030304' : '#a1a1aa',
                    boxShadow: isActive ? '0 0 16px rgba(255,255,255,0.3)' : 'none',
                  }}
                >
                  {g.name}
                </button>
              );
            })}
          </div>

          {/* Content Rendering: Grid when filtered, Rows when 'All' */}
          {activePill !== 'All' ? (
            <div style={{ padding: isMobile ? '0 16px' : '0 32px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 20,
              }}>
                <h2 style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: isMobile ? 18 : 22, fontWeight: 700, color: '#ffffff', margin: 0,
                }}>
                  {activePill}
                </h2>
                <span style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 12, color: '#71717a',
                }}>
                  {activeItems?.length || 0} Titles
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(130px, 1fr))' : 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: isMobile ? 12 : 18,
              }}>
                {activeItems?.map((item, idx) => (
                  <div key={item._id || item.id || idx} style={{ display: 'flex', justifyContent: 'center' }}>
                    <MediaCard media={item} type="anime" size={isMobile ? 'sm' : 'md'} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <AnimeRow
                title="Trending Now"
                items={trending}
                icon={TrendingUp}
                isFirst
                onSeeAll={setActivePill}
                isMobile={isMobile}
              />
              <AnimeRow
                title="Popular All Time"
                items={popular}
                icon={Award}
                onSeeAll={setActivePill}
                isMobile={isMobile}
              />
              {ANIME_GENRES.filter(g => g.queryGenre).map(g => (
                <AnimeRow
                  key={g.name}
                  title={g.name}
                  items={genrePools[g.name]}
                  icon={g.icon}
                  onSeeAll={setActivePill}
                  isMobile={isMobile}
                />
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Styles ──
const ANIME_CSS = `
  .an-randomizer {
    display: flex;
    align-items: center;
    gap: 24px;
    background: rgba(14, 14, 18, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 16px;
    padding: 20px 24px;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.12);
  }
  @media (max-width: 768px) {
    .an-randomizer {
      gap: 16px;
      padding: 16px;
    }
  }

  .an-randomizer-preview {
    width: 80px;
    height: 115px;
    border-radius: 10px;
    overflow: hidden;
    flex-shrink: 0;
    background: #09090c;
    border: 1px solid rgba(255, 255, 255, 0.15);
  }
  @media (max-width: 768px) {
    .an-randomizer-preview {
      width: 65px;
      height: 94px;
    }
  }
  .an-randomizer-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.15s ease;
  }
  .an-shuffling {
    filter: blur(2px) grayscale(1);
    transform: scale(0.96);
  }
  .an-randomizer-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.04);
  }

  .an-randomizer-info {
    flex: 1;
    min-width: 0;
  }
  .an-randomizer-eyebrow {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #a1a1aa;
    margin-bottom: 4px;
  }
  .an-randomizer-info h2 {
    font-family: 'Cinzel', serif;
    font-size: 20px;
    font-weight: 700;
    color: #ffffff;
    margin: 0 0 6px 0;
  }
  .an-randomizer-info p {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 12.5px;
    color: #71717a;
    margin: 0 0 14px 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .an-randomizer-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 18px;
    border-radius: 9px;
    background: #ffffff;
    color: #030304;
    border: none;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 0 16px rgba(255, 255, 255, 0.25);
    transition: all 0.2s ease;
  }
  .an-randomizer-btn:hover {
    box-shadow: 0 0 24px rgba(255, 255, 255, 0.45);
    transform: translateY(-1px);
  }
  .an-randomizer-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .an-nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(10, 10, 14, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 5;
    backdrop-filter: blur(12px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7);
    transition: all 0.2s;
  }
  .an-nav-btn:hover {
    background: #ffffff;
    color: #030304;
    box-shadow: 0 0 16px rgba(255, 255, 255, 0.4);
  }
  .an-nav-left { left: 8px; }
  .an-nav-right { right: 8px; }

  .an-card-skeleton {
    background: linear-gradient(90deg, #09090c 25%, #18181f 50%, #09090c 75%);
    background-size: 200% 100%;
    animation: an-shimmer 1.5s ease infinite;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  @keyframes an-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes an-spin {
    to { transform: rotate(360deg); }
  }
  .an-spin {
    animation: an-spin 0.6s linear infinite;
  }

  .an-search-container {
    padding: 0 32px 24px;
  }
  @media (max-width: 768px) {
    .an-search-container {
      padding: 0 16px 20px;
    }
  }

  .an-search-box {
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(14, 14, 18, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 14px;
    padding: 12px 18px;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08);
    transition: all 0.2s ease;
  }
  .an-search-box:focus-within {
    border-color: rgba(255, 255, 255, 0.35);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6), 0 0 16px rgba(255, 255, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  }

  .an-search-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    color: #ffffff;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 14px;
    font-weight: 500;
  }
  .an-search-input::placeholder {
    color: #71717a;
  }

  .an-search-clear {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.14);
    color: #d4d4d8;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }
  .an-search-clear:hover {
    background: #ffffff;
    color: #030304;
  }
`;
