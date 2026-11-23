import { useState, useEffect, useMemo, useRef } from 'react'
import { getMovies, getShows, getMoviesByGenre, getShowsByGenre } from '../../services/mediaService'
import MediaCard from '../components/MediaCard'
import HeroSlider from '../components/HeroSlider'
import VideoPlayer from '../components/VideoPlayer'
import { useLocation, useNavigate } from 'react-router-dom'
import { getLastWatched, clearLastWatched } from '../../services/Watchhistory'
import { getWatchHistory } from '../../services/indexedDbHistory'
import { getTrendingAnime } from '../../services/animeService'
import { motion } from 'framer-motion'
import { Film, Tv, TrendingUp, Zap, Laugh, Rocket, Ghost, Drama, Swords, Fingerprint, ChevronRight, ChevronLeft, Play, X, RotateCcw, Heart, Clock, Sparkles } from 'lucide-react'

// Pure monochrome glassmorphism genre icons
const MOVIE_HOME_GENRES = [
  { name: 'Action',           icon: Zap,        tmdbId: 28 },
  { name: 'Comedy',           icon: Laugh,      tmdbId: 35 },
  { name: 'Science Fiction',  icon: Rocket,     tmdbId: 878 },
  { name: 'Horror',           icon: Ghost,      tmdbId: 27 },
];

const SERIES_HOME_GENRES = [
  { name: 'Drama',              icon: Drama,       tmdbId: 18 },
  { name: 'Comedy',              icon: Laugh,      tmdbId: 35 },
  { name: 'Action & Adventure',  icon: Swords,     tmdbId: 10759 },
  { name: 'Crime',               icon: Fingerprint,tmdbId: 80 },
];

// ── ContentRow — Pure Monochrome Netflix-style horizontal row ──
function ContentRow({ title, items, type, icon: Icon, isFirst, isMobile }) {
  const trackRef = useRef(null);

  const scrollByAmount = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: el.clientWidth * 0.85 * dir, behavior: 'smooth' });
  };

  if (!items || items.length === 0) return null;

  return (
    <motion.div
      className="hm-row"
      style={{ marginBottom: isFirst ? 24 : 32 }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: isMobile ? '0 16px' : '0 32px', marginBottom: 12,
      }}>
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
        <h3 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: isMobile ? 14.5 : 16,
          fontWeight: 600, color: '#ffffff', margin: 0, letterSpacing: '-0.1px',
        }}>{title}</h3>
      </div>

      <div className="hm-row-wrap" style={{ position: 'relative' }}>
        {!isMobile && (
          <button aria-label="Scroll left" className="hm-arrow hm-arrow-l" onClick={() => scrollByAmount(-1)}>
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
          {items.map((item, i) => (
            <div key={item._id || item.imdb_id || i} className="hm-card" style={{ flexShrink: 0, scrollSnapAlign: 'start' }}>
              <MediaCard media={item} type={type} index={i} size={isMobile ? 'sm' : 'md'} />
            </div>
          ))}
        </div>

        {!isMobile && (
          <button aria-label="Scroll right" className="hm-arrow hm-arrow-r" onClick={() => scrollByAmount(1)}>
            <ChevronRight size={22} color="#ffffff" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function Home() {
  const [watchlist, setWatchlist] = useState([])
  const [movies, setMovies] = useState([])
  const [series, setSeries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [loadingSeries, setLoadingSeries] = useState(true)
  const [playingMedia, setPlayingMedia] = useState(null)
  const [showQR, setShowQR] = useState(false)
  const [movieGenrePools, setMovieGenrePools] = useState({})
  const [seriesGenrePools, setSeriesGenrePools] = useState({})
  const [continueWatching, setContinueWatching] = useState(() => getLastWatched())
  const [historyList, setHistoryList] = useState([])
  const [animeList, setAnimeList] = useState([])
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  )

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    getWatchHistory().then(items => setHistoryList(items || []));
    getTrendingAnime(1, 16).then(items => setAnimeList(items || []));
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (location.state?.playMedia) {
      setPlayingMedia(location.state.playMedia);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const toggleWatchlist = (id) => {
    setWatchlist(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    )
  }

  const handlePlay = (media) => {
    setPlayingMedia(media);
  };

  const handleClosePlayer = () => {
    setPlayingMedia(null);
  };

  const handleResumeContinue = () => {
    if (!continueWatching) return;
    const { media, season, episode } = continueWatching;
    const type = media.type || 'movie';
    const id = media._id || media.imdb_id || media.id;
    navigate(`/watch/${type}/${id}`, {
      state: {
        media,
        autoPlay: true,
        startSeason: season,
        startEpisode: episode,
      }
    });
  };

  const handleDismissContinue = () => {
    clearLastWatched();
    setContinueWatching(null);
  };

  const Message = 'Become a Supporter ^_^'; 

  const openUPIApp = (amount = 10) => {
    const upiLink = `upi://pay?pa=${Message}&pn=StreamHub&tn=Donation&am=${amount}&cu=INR`;
    window.open(upiLink, '_blank');
  };

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getMovies()
        setMovies(data || [])
        if (!data || data.length === 0) {
          setError("No movies available at the moment.")
        }
      } catch (err) {
        console.error("Failed to fetch movies:", err)
        setError("Failed to load movies. Please check your connection.")
        setMovies([])
      } finally {
        setLoading(false)
      }
    }

    fetchMovies()
  }, [])

  useEffect(() => {
    const fetchSeries = async () => {
      try {
        setLoadingSeries(true)
        const data = await getShows()
        setSeries(data || [])
      } catch (err) {
        console.error("Failed to fetch series:", err)
        setSeries([])
      } finally {
        setLoadingSeries(false)
      }
    }

    fetchSeries()
  }, [])

  useEffect(() => {
    let cancelled = false;

    const loadGenrePools = async () => {
      const [movieResults, seriesResults] = await Promise.all([
        Promise.all(MOVIE_HOME_GENRES.map(g =>
          getMoviesByGenre(g.tmdbId).then(data => [g.name, Array.isArray(data) ? data : []])
        )),
        Promise.all(SERIES_HOME_GENRES.map(g =>
          getShowsByGenre(g.tmdbId).then(data => [g.name, Array.isArray(data) ? data : []])
        )),
      ]);

      if (cancelled) return;
      setMovieGenrePools(Object.fromEntries(movieResults));
      setSeriesGenrePools(Object.fromEntries(seriesResults));
    };

    loadGenrePools().catch(err => console.error('Failed to load genre pools:', err));

    return () => { cancelled = true; };
  }, [])

  const trendingMoviesSorted = useMemo(() =>
    [...movies].sort((a, b) => {
      const ra = typeof a.rating === 'object' ? a.rating.percentage / 10 : (a.rating || 0);
      const rb = typeof b.rating === 'object' ? b.rating.percentage / 10 : (b.rating || 0);
      return rb - ra;
    }).slice(0, 20), [movies]);

  const trendingSeriesSorted = useMemo(() =>
    [...series].sort((a, b) => {
      const ra = typeof a.rating === 'object' ? a.rating.percentage / 10 : (a.rating || 0);
      const rb = typeof b.rating === 'object' ? b.rating.percentage / 10 : (b.rating || 0);
      return rb - ra;
    }).slice(0, 20), [series]);

  // Loading state
  if (loading) {
    return (
      <div style={{ background: '#030304', minHeight: '100vh', paddingTop: 90, overflow: 'hidden' }}>
        <style>{HOME_ROW_CSS}</style>
        <div style={{ padding: isMobile ? '0 16px' : '0 32px' }}>
          <div className="hm-skeleton" style={{ width: '100%', maxWidth: 900, aspectRatio: isMobile ? '4/5' : '21/9', borderRadius: 16, marginBottom: 32 }} />
        </div>
        {[1, 2, 3].map(row => (
          <div key={row} style={{ marginBottom: 32 }}>
            <div style={{ padding: isMobile ? '0 16px' : '0 32px', marginBottom: 14 }}>
              <div className="hm-skeleton" style={{ width: 150, height: 18, borderRadius: 6 }} />
            </div>
            <div style={{ display: 'flex', gap: isMobile ? 10 : 12, overflow: 'hidden', padding: isMobile ? '0 16px' : '0 32px' }}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="hm-skeleton" style={{
                  width: isMobile ? 130 : 160, height: isMobile ? 190 : 235,
                  flexShrink: 0, borderRadius: 12,
                }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Error state 
  if (error && movies.length === 0 && series.length === 0) {
    return (
      <div style={{
        background: "#030304",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        paddingTop: 90,
        paddingLeft: 20,
        paddingRight: 20,
      }}>
        <div style={{
          textAlign: "center", maxWidth: 400, padding: '40px 32px',
          background: 'rgba(18, 18, 22, 0.7)', border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 20, backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.15)',
        }}>
          <Film size={44} color="#ffffff" style={{ margin: "0 auto 18px", opacity: 0.8 }} />
          <h2 style={{ color: "#ffffff", marginBottom: 10, fontSize: 22, fontWeight: 700, fontFamily: "'Cinzel', serif" }}>Archive Notice</h2>
          <p style={{ color: "#a1a1aa", marginBottom: 26, fontSize: 14.5, lineHeight: 1.6 }}>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: "13px 32px",
              background: "#ffffff",
              color: "#030304",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontSize: 15,
              fontWeight: 700,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              boxShadow: "0 0 20px rgba(255, 255, 255, 0.3)",
              transition: "transform 0.15s ease",
            }}
            onMouseEnter={(e) => e.target.style.transform = "scale(1.03)"}
            onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{HOME_ROW_CSS}</style>
      <div className="page-content" style={{
        background: "#030304",
        minHeight: "100vh",
        paddingTop: 70,
        paddingBottom: 40,
        overflowX: "hidden",
        position: "relative",
      }}>
        {/* Ambient specular illumination in pure monochrome */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1000,
          pointerEvents: 'none', zIndex: 0, overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -150, left: '20%', width: 700, height: 700,
            borderRadius: '50%', background: 'radial-gradient(circle, rgba(255, 255, 255, 0.04), transparent 70%)',
          }} />
          <div style={{
            position: 'absolute', top: 300, right: '10%', width: 600, height: 600,
            borderRadius: '50%', background: 'radial-gradient(circle, rgba(255, 255, 255, 0.025), transparent 70%)',
          }} />
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Hero Slider */}
        {movies.length > 0 && (
          <HeroSlider
            slides={movies.slice(0, 4)}
            watchlist={watchlist}
            onAddList={(id) => toggleWatchlist(id)}
            onPlay={handlePlay}
          />
        )}

        {/* ===== CONTINUE WATCHING ===== */}
        {continueWatching && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            style={{ padding: isMobile ? '20px 16px 0' : '28px 32px 0' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              }}>
                <RotateCcw size={14} color="#ffffff" strokeWidth={2.2} />
              </div>
              <h2 style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: isMobile ? 13 : 14.5,
                fontWeight: 700, color: '#ffffff', margin: 0,
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>Continue Watching</h2>
            </div>

            <div
              className="cw-card"
              onClick={handleResumeContinue}
              style={{
                position: 'relative', display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
                background: 'rgba(18, 18, 24, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
              }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); handleDismissContinue(); }}
                aria-label="Remove from Continue Watching"
                style={{
                  position: 'absolute', top: 12, right: 12, zIndex: 3,
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  backdropFilter: 'blur(6px)',
                }}
              >
                <X size={15} />
              </button>

              <div style={{
                position: 'relative', flexShrink: 0,
                width: isMobile ? '100%' : 360,
                aspectRatio: '16/9', background: '#000',
              }}>
                <img
                  src={continueWatching.media.images?.fanart || continueWatching.media.images?.poster}
                  alt={continueWatching.media.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: isMobile
                    ? 'linear-gradient(to top, rgba(3,3,4,0.95), rgba(3,3,4,0.1) 60%)'
                    : 'linear-gradient(to right, rgba(3,3,4,0.2), rgba(3,3,4,0.65))',
                }} />
                <div className="cw-play-btn" style={{
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  width: 52, height: 52, borderRadius: '50%',
                  background: '#ffffff',
                  boxShadow: '0 0 25px rgba(255, 255, 255, 0.4), 0 8px 24px rgba(0,0,0,0.6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Play size={20} fill="#030304" color="#030304" style={{ marginLeft: 3 }} />
                </div>
              </div>

              <div style={{ flex: 1, padding: isMobile ? '16px' : '22px 28px', minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h3 style={{
                  fontFamily: "'Cinzel', 'Playfair Display', serif", fontSize: isMobile ? 18 : 22,
                  fontWeight: 800, color: '#ffffff', margin: '0 0 6px', letterSpacing: '-0.3px',
                }}>{continueWatching.media.title}</h3>
                <p style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: '#d4d4d8',
                  fontWeight: 600, margin: '0 0 10px',
                }}>
                  {continueWatching.season
                    ? `Season ${continueWatching.season} • Episode ${continueWatching.episode}${continueWatching.episodeName ? `: ${continueWatching.episodeName}` : ''}`
                    : (continueWatching.media.year ? `Movie • ${continueWatching.media.year}` : 'Movie')}
                </p>
                {continueWatching.media.synopsis && !isMobile && (
                  <p style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: '#a1a1aa',
                    lineHeight: 1.6, margin: '0 0 16px',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>{continueWatching.media.synopsis}</p>
                )}
                <div>
                  <button
                    className="cw-resume-btn"
                    onClick={(e) => { e.stopPropagation(); handleResumeContinue(); }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      background: '#ffffff', color: '#030304', border: 'none',
                      borderRadius: 10, padding: '11px 24px', fontSize: 14, fontWeight: 700,
                      fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: 'pointer',
                      boxShadow: '0 0 18px rgba(255, 255, 255, 0.25)',
                    }}
                  >
                    <Play size={15} fill="#030304" /> Resume
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ===== GUEST WATCH HISTORY (IndexedDB) ===== */}
        {historyList.length > 0 && (
          <div style={{ marginTop: 24, marginBottom: 16 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: isMobile ? '0 16px' : '0 32px', marginBottom: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Clock size={15} color="#ffffff" />
                </div>
                <h2 style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: isMobile ? 16 : 18,
                  fontWeight: 700, color: '#ffffff', margin: 0,
                }}>
                  Jump Back In
                </h2>
                <span style={{
                  padding: '2px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)', fontSize: 10.5, color: '#a1a1aa',
                  fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600,
                }}>
                  Guest History ({historyList.length})
                </span>
              </div>
              <button
                onClick={() => navigate('/history')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
                  cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12.5,
                  color: '#a1a1aa', fontWeight: 600, padding: 0, transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={e => e.currentTarget.style.color = '#a1a1aa'}
              >
                All History <ChevronRight size={13} />
              </button>
            </div>

            <div className="hide-scrollbar" style={{
              display: 'flex', gap: isMobile ? 10 : 12, overflowX: 'auto',
              padding: isMobile ? '0 16px 8px' : '0 32px 8px', scrollSnapType: 'x mandatory',
            }}>
              {historyList.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    const targetType = item.type === 'tv' ? 'series' : item.type;
                    navigate(`/watch/${targetType}/${item.mediaId}`, {
                      state: {
                        media: {
                          _id: item.mediaId, id: item.mediaId, title: item.title,
                          type: item.type, year: item.year, rating: item.rating,
                          images: { poster: item.poster, fanart: item.backdrop },
                        },
                        startSeason: item.season || 1,
                        startEpisode: item.episode || 1,
                        autoPlay: true,
                      }
                    });
                  }}
                  style={{
                    width: isMobile ? 130 : 160,
                    flexShrink: 0,
                    cursor: 'pointer',
                    scrollSnapAlign: 'start',
                    borderRadius: 12,
                    overflow: 'hidden',
                    background: 'rgba(14, 14, 18, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ position: 'relative', width: '100%', height: isMobile ? 185 : 230, background: '#09090c' }}>
                    {item.poster ? (
                      <img src={item.poster} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Film size={24} color="#71717a" />
                      </div>
                    )}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(to top, rgba(3, 3, 4, 0.95) 0%, transparent 60%)',
                    }} />
                    <div style={{
                      position: 'absolute', top: 8, left: 8,
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 4, padding: '2px 6px', fontSize: 9, fontWeight: 700, color: '#ffffff',
                    }}>
                      {item.type.toUpperCase()}
                    </div>
                    <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8 }}>
                      <div style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12.5, fontWeight: 700,
                        color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{item.title}</div>
                      <div style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 10.5, color: '#a1a1aa', marginTop: 2,
                      }}>
                        {item.episode ? `Ep ${item.episode}` : (item.year || '—')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== MOVIES SECTION ===== */}
        <div style={{ marginTop: movies.length > 0 ? 44 : 0 }}>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: isMobile ? '0 16px' : '0 32px', marginBottom: 18,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 14px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
              }}>
                <Film size={16} color="#ffffff" strokeWidth={2} />
              </div>
              <h2 style={{
                fontFamily: "'Cinzel', 'Playfair Display', serif", fontSize: isMobile ? 20 : 24,
                fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.3px',
              }}>Movies</h2>
            </div>
            <button
              className="hm-explore-btn"
              onClick={() => navigate('/movies')}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13,
                color: '#a1a1aa', fontWeight: 600, padding: 0,
              }}
            >
              Explore All <ChevronRight size={14} />
            </button>
          </motion.div>

          {movies.length > 0 ? (
            <>
              <ContentRow title="Trending Now" items={trendingMoviesSorted} type="movie" icon={TrendingUp} isFirst isMobile={isMobile} />
              {MOVIE_HOME_GENRES.map(g => (
                <ContentRow key={g.name} title={g.name} items={movieGenrePools[g.name]} type="movie"
                  icon={g.icon} isMobile={isMobile} />
              ))}
            </>
          ) : (
            <div style={{ padding: "40px 16px", textAlign: "center", color: "#71717a", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <p style={{ fontSize: 15, marginBottom: 8 }}>No movies available right now.</p>
              <p style={{ fontSize: 13, color: "#52525b" }}>Check back shortly for new additions.</p>
            </div>
          )}
        </div>

        {/* ===== SERIES SECTION ===== */}
        <div style={{ marginTop: 24 }}>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: isMobile ? '0 16px' : '0 32px', marginBottom: 18,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 14px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
              }}>
                <Tv size={16} color="#ffffff" strokeWidth={2} />
              </div>
              <h2 style={{
                fontFamily: "'Cinzel', 'Playfair Display', serif", fontSize: isMobile ? 20 : 24,
                fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.3px',
              }}>Series</h2>
            </div>
            <button
              className="hm-explore-btn"
              onClick={() => navigate('/series')}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13,
                color: '#a1a1aa', fontWeight: 600, padding: 0,
              }}
            >
              Explore All <ChevronRight size={14} />
            </button>
          </motion.div>

          {loadingSeries ? (
            <div style={{ padding: "40px 0", textAlign: "center" }}>
              <p style={{ color: "#71717a", fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15 }}>
                Loading series...
              </p>
            </div>
          ) : series.length > 0 ? (
            <>
              <ContentRow title="Trending Now" items={trendingSeriesSorted} type="series" icon={TrendingUp} isFirst isMobile={isMobile} />
              {SERIES_HOME_GENRES.map(g => (
                <ContentRow key={g.name} title={g.name} items={seriesGenrePools[g.name]} type="series"
                  icon={g.icon} isMobile={isMobile} />
              ))}
            </>
          ) : (
            <div style={{ padding: "40px 16px", textAlign: "center", color: "#71717a", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <p style={{ fontSize: 15, marginBottom: 8 }}>No series available right now.</p>
              <p style={{ fontSize: 13, color: "#52525b" }}>Popular television shows will appear here.</p>
            </div>
          )}
        </div>

        {/* ===== ANIME SECTION ===== */}
        <div style={{ marginTop: 44 }}>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: isMobile ? '0 16px' : '0 32px', marginBottom: 18,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 14px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
              }}>
                <Sparkles size={16} color="#ffffff" strokeWidth={2} />
              </div>
              <h2 style={{
                fontFamily: "'Cinzel', 'Playfair Display', serif", fontSize: isMobile ? 20 : 24,
                fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.3px',
              }}>Anime</h2>
            </div>
            <button
              className="hm-explore-btn"
              onClick={() => navigate('/anime')}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13,
                color: '#a1a1aa', fontWeight: 600, padding: 0,
              }}
            >
              Explore All <ChevronRight size={14} />
            </button>
          </motion.div>

          <ContentRow
            title="Trending Anime"
            items={animeList}
            type="anime"
            icon={TrendingUp}
            isMobile={isMobile}
          />
        </div>

        {/* ===== FOOTER & SUPPORT SECTION (Monochrome Gothic Glass) ===== */}
        <div style={{
          marginTop: 70,
          paddingTop: 45,
          paddingLeft: isMobile ? 16 : 32,
          paddingRight: isMobile ? 16 : 32,
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        }}>
          
          {/* Donation Section */}
          <div style={{
            maxWidth: 520,
            margin: "0 auto 40px",
            background: "rgba(16, 16, 22, 0.7)",
            borderRadius: 20,
            padding: isMobile ? 24 : 32,
            border: "1px solid rgba(255, 255, 255, 0.12)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
            textAlign: "center",
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, margin: "0 auto 16px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.22)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 16px rgba(255, 255, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
            }}>
              <Heart size={24} color="#ffffff" fill="#ffffff" />
            </div>
            <h3 style={{
              color: "#ffffff",
              fontSize: 22,
              fontWeight: 700,
              margin: "0 0 10px 0",
              fontFamily: "'Cinzel', serif",
            }}>
              Support SinStreams
            </h3>
            <p style={{
              color: "#a1a1aa",
              fontSize: 14,
              lineHeight: 1.6,
              marginBottom: 22,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>
              Help preserve independent streaming and support future development. 
              Every contribution powers the servers and archives.
            </p>

            {!showQR ? (
              <button
                onClick={() => setShowQR(true)}
                style={{
                  background: "#ffffff",
                  color: "#030304",
                  border: "none",
                  borderRadius: 11,
                  padding: "13px 32px",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  boxShadow: "0 0 20px rgba(255, 255, 255, 0.25)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 0 28px rgba(255, 255, 255, 0.4)"; }}
                onMouseLeave={(e) => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 0 20px rgba(255, 255, 255, 0.25)"; }}
              >
                Support with UPI
              </button>
            ) : (
              <div>
                <div style={{
                  width: 180,
                  height: 180,
                  margin: "0 auto 16px",
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  background: "#ffffff",
                  padding: 8,
                }}>
                  <img 
                    src="/images/donation-qr.jpeg" 
                    alt="UPI QR Code"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#000;font-size:13px;font-family:sans-serif;">QR Code Placeholder</div>';
                    }}
                  />
                </div>

                <div style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  borderRadius: 10,
                  padding: "10px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                }}>
                  <code style={{
                    color: "#ffffff",
                    fontSize: 13,
                    fontFamily: "monospace",
                  }}>
                    {Message}
                  </code>
                </div>

                {/* Quick Pay Buttons */}
                <div style={{ marginBottom: 15 }}>
                  <p style={{
                    color: "#71717a",
                    fontSize: 12,
                    marginBottom: 10,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}>
                    Suggested amounts:
                  </p>
                  <div style={{
                    display: "flex",
                    gap: 10,
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}>
                    {[10, 50, 100].map(amount => (
                      <button
                        key={amount}
                        onClick={() => openUPIApp(amount)}
                        style={{
                          background: "rgba(255, 255, 255, 0.06)",
                          color: "#ffffff",
                          border: "1px solid rgba(255, 255, 255, 0.16)",
                          borderRadius: 8,
                          padding: "8px 18px",
                          cursor: "pointer",
                          fontSize: 14,
                          fontWeight: 600,
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = "rgba(255, 255, 255, 0.15)";
                          e.target.style.borderColor = "rgba(255, 255, 255, 0.4)";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = "rgba(255, 255, 255, 0.06)";
                          e.target.style.borderColor = "rgba(255, 255, 255, 0.16)";
                        }}
                      >
                        ₹{amount}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <p style={{
              color: "#71717a",
              fontSize: 11,
              marginTop: 15,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>
              🔒 Voluntary contributions • Thank you for your support
            </p>
          </div>

          {/* Contact Section */}
          <div style={{
            textAlign: "center",
            marginBottom: 32,
          }}>
            <p style={{
              color: "#a1a1aa",
              fontSize: 13.5,
              marginBottom: 12,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>
              Need assistance or want to connect?
            </p>
            <a
              href="https://www.instagram.com/_ut_sr/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                color: "#ffffff",
                textDecoration: "none",
                padding: "11px 22px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                transition: "all 0.2s ease",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "rgba(255, 255, 255, 0.14)";
                e.target.style.borderColor = "rgba(255, 255, 255, 0.4)";
                e.target.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "rgba(255, 255, 255, 0.06)";
                e.target.style.borderColor = "rgba(255, 255, 255, 0.18)";
                e.target.style.transform = "translateY(0)";
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              @_ut_sr
            </a>
          </div>

          {/* Developer Credit */}
          <div style={{
            textAlign: "center",
            paddingTop: 22,
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
          }}>
            <p style={{
              color: "#a1a1aa",
              fontSize: 13,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              margin: 0,
            }}>
              Crafted by{' '}
              <span style={{
                color: "#ffffff",
                fontWeight: 700,
                letterSpacing: "0.5px",
              }}>
                Uttkarsh
              </span>
              {' '}© {new Date().getFullYear()}
            </p>
            <p style={{
              color: "#52525b",
              fontSize: 11,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              marginTop: 5,
            }}>
              SinStreams • Pure Monochrome Glassmorphic Experience
            </p>
          </div>

        </div>
        </div>
      </div>

      {/* Video Player Modal */}
      {playingMedia && (
        <VideoPlayer
          media={playingMedia}
          onClose={handleClosePlayer}
        />
      )}
    </>
  )
}

const HOME_ROW_CSS = `
  @keyframes hm-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

  .hm-skeleton {
    background: linear-gradient(90deg, #09090d 25%, #181822 50%, #09090d 75%);
    background-size: 200% 100%;
    animation: hm-shimmer 1.4s ease infinite;
  }

  .hm-explore-btn { transition: color 0.2s ease; }
  .hm-explore-btn svg { transition: transform 0.2s ease; }
  @media (hover: hover) and (pointer: fine) {
    .hm-explore-btn:hover { color: #ffffff !important; }
    .hm-explore-btn:hover svg { transform: translateX(4px); }
  }

  .cw-resume-btn { transition: transform 0.15s ease, box-shadow 0.15s ease; }
  @media (hover: hover) and (pointer: fine) {
    .cw-resume-btn:hover { transform: translateY(-1px); box-shadow: 0 0 25px rgba(255, 255, 255, 0.45) !important; }
  }

  /* Continue Watching card */
  @media (hover: hover) and (pointer: fine) {
    .cw-card { transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease; }
    .cw-card:hover { border-color: rgba(255, 255, 255, 0.35) !important; transform: translateY(-2px); box-shadow: 0 20px 50px rgba(0,0,0,0.8), 0 0 20px rgba(255,255,255,0.08) !important; }
    .cw-card:hover .cw-play-btn { transform: translate(-50%, -50%) scale(1.08); box-shadow: 0 0 30px rgba(255,255,255,0.6) !important; }
  }
  .cw-play-btn { transition: transform 0.2s ease, box-shadow 0.2s ease; }

  /* Hover zoom on cards (desktop only) */
  @media (hover: hover) and (pointer: fine) {
    .hm-card {
      transition: transform 0.28s cubic-bezier(0.25, 0.8, 0.25, 1);
      transform-origin: center center;
    }
    .hm-card:hover {
      transform: scale(1.06);
      z-index: 5;
      position: relative;
    }
  }

  /* Row scroll arrows */
  .hm-arrow {
    position: absolute; top: 0; bottom: 14px;
    width: 48px; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(90deg, rgba(3,3,4,0.95) 20%, transparent);
    border: none; color: #ffffff; cursor: pointer;
    opacity: 0; transition: opacity 0.2s ease;
    z-index: 6;
  }
  .hm-arrow-r { right: 0; background: linear-gradient(270deg, rgba(3,3,4,0.95) 20%, transparent); }
  .hm-arrow-l { left: 0; }
  .hm-row:hover .hm-arrow { opacity: 1; }

  .hm-row-wrap ::-webkit-scrollbar { height: 0; width: 0; }
`;
