import { useState, useEffect, useMemo, useRef } from 'react'
import { getMovies, getShows, getMoviesByGenre, getShowsByGenre } from '../../services/mediaService'
import MediaCard from '../components/MediaCard'
import HeroSlider from '../components/HeroSlider'
import VideoPlayer from '../components/VideoPlayer'
import { useLocation, useNavigate } from 'react-router-dom'
import { getAnime } from '../../services/mediaService'
import { getLastWatched, clearLastWatched } from '../../services/watchHistory'
import { motion } from 'framer-motion'
import { Film, Tv, TrendingUp, Zap, Laugh, Rocket, Ghost, Drama, Swords, Fingerprint, ChevronRight, ChevronLeft, Play, X, RotateCcw, Heart, Sparkles } from 'lucide-react'

// Curated genre picks for the homepage — the dedicated /movies and /series
// pages cover the full genre list, so Home only teases a handful of each.
const MOVIE_HOME_GENRES = [
  { name: 'Action',           icon: Zap,    gradient: 'linear-gradient(135deg, #ff4444, #cc0000)', tmdbId: 28 },
  { name: 'Comedy',           icon: Laugh,  gradient: 'linear-gradient(135deg, #ff9800, #f57c00)', tmdbId: 35 },
  { name: 'Science Fiction',  icon: Rocket, gradient: 'linear-gradient(135deg, #4fc3f7, #0288d1)', tmdbId: 878 },
  { name: 'Horror',           icon: Ghost,  gradient: 'linear-gradient(135deg, #7b1fa2, #4a0072)', tmdbId: 27 },
];

const SERIES_HOME_GENRES = [
  { name: 'Drama',              icon: Drama,       gradient: 'linear-gradient(135deg, #5c6bc0, #283593)', tmdbId: 18 },
  { name: 'Comedy',              icon: Laugh,      gradient: 'linear-gradient(135deg, #ff9800, #f57c00)', tmdbId: 35 },
  { name: 'Action & Adventure',  icon: Swords,     gradient: 'linear-gradient(135deg, #ff4444, #cc0000)', tmdbId: 10759 },
  { name: 'Crime',               icon: Fingerprint,gradient: 'linear-gradient(135deg, #7b1fa2, #4a0072)', tmdbId: 80 },
];

// ── ContentRow — Netflix-style horizontal row shared by the Movies & Series
//    sections on Home. Same pattern as MovieRow/SeriesRow in Movies.jsx / Series.jsx. ──
function ContentRow({ title, items, type, gradient, icon: Icon, isFirst, isMobile }) {
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
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: isMobile ? '0 16px' : '0 32px', marginBottom: 12,
      }}>
        {Icon && (
          <div style={{
            width: 26, height: 26, borderRadius: 7, flexShrink: 0,
            background: gradient || 'rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
          }}>
            <Icon size={13} color="#fff" />
          </div>
        )}
        <h3 style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: isMobile ? 14 : 15.5,
          fontWeight: 600, color: '#c8d0e0', margin: 0, letterSpacing: '-0.1px',
        }}>{title}</h3>
      </div>

      <div className="hm-row-wrap" style={{ position: 'relative' }}>
        {!isMobile && (
          <button aria-label="Scroll left" className="hm-arrow hm-arrow-l" onClick={() => scrollByAmount(-1)}>
            <ChevronLeft size={20} />
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
          {items.map((item, i) => (
            <div key={item._id || item.imdb_id || i} className="hm-card" style={{ flexShrink: 0, scrollSnapAlign: 'start' }}>
              <MediaCard media={item} type={type} index={i} size={isMobile ? 'sm' : 'md'} />
            </div>
          ))}
        </div>

        {!isMobile && (
          <button aria-label="Scroll right" className="hm-arrow hm-arrow-r" onClick={() => scrollByAmount(1)}>
            <ChevronRight size={20} />
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
  const [copied, setCopied] = useState(false)
  const [movieGenrePools, setMovieGenrePools] = useState({})
  const [seriesGenrePools, setSeriesGenrePools] = useState({})
  const [continueWatching, setContinueWatching] = useState(() => getLastWatched())
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  )

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (location.state?.playMedia) {
      console.log("Playing media from search:", location.state.playMedia.title);
      setPlayingMedia(location.state.playMedia);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Toggle watchlist function
  const toggleWatchlist = (id) => {
    setWatchlist(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    )
  }

  // Handle play media
  const handlePlay = (media) => {
    console.log("🎬 Playing:", media.title);
    setPlayingMedia(media);
  };

  // Handle close player
  const handleClosePlayer = () => {
    setPlayingMedia(null);
  };

  // Continue Watching — resume the last-watched title at its saved point
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

  // UPI functions
  const Message = 'Become a Supporter ^_^'; 

  const openUPIApp = (amount = 10) => {
    const upiLink = `upi://pay?pa=${Message}&pn=StreamHub&tn=Donation&am=${amount}&cu=INR`;
    window.open(upiLink, '_blank');
  };

  // Fetch movies
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const data = await getMovies()
        console.log("Movies loaded:", data?.length || 0, "items")
        
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

  // Fetch series
  useEffect(() => {
    const fetchSeries = async () => {
      try {
        setLoadingSeries(true)
        
        const data = await getShows()
        console.log("Series loaded:", data?.length || 0, "items")
        
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

  // Fetch curated genre pools for the Movies & Series rows
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

  // Top-rated slices used for the "Trending Now" row in each section
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
      <div style={{ background: '#080c14', minHeight: '100vh', paddingTop: 90, overflow: 'hidden' }}>
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
        background: "#080c14",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "'DM Sans', sans-serif",
        paddingTop: 90,
        paddingLeft: 20,
        paddingRight: 20,
      }}>
        <div style={{
          textAlign: "center", maxWidth: 380, padding: '40px 32px',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20, backdropFilter: 'blur(12px)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 18 }}>😕</div>
          <h2 style={{ color: "#e8eaf0", marginBottom: 10, fontSize: 21, fontWeight: 700 }}>Something went wrong</h2>
          <p style={{ color: "#6878a0", marginBottom: 26, fontSize: 14.5, lineHeight: 1.6 }}>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: "13px 30px",
              background: "#e8b84b",
              color: "#080c14",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontSize: 15,
              fontWeight: 700,
              fontFamily: "'DM Sans', sans-serif",
              transition: "transform 0.15s ease",
            }}
            onMouseEnter={(e) => e.target.style.transform = "scale(1.03)"}
            onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{HOME_ROW_CSS}</style>
      <div className="page-content" style={{
        background: "#080c14",
        minHeight: "100vh",
        paddingTop: 90,
        paddingBottom: 40,
        overflowX: "hidden",
        position: "relative",
      }}>
        {/* Ambient background glow — subtle, adds depth without distracting */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 900,
          pointerEvents: 'none', zIndex: 0, overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -200, left: '10%', width: 600, height: 600,
            borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,184,75,0.06), transparent 70%)',
          }} />
          <div style={{
            position: 'absolute', top: 100, right: '5%', width: 500, height: 500,
            borderRadius: '50%', background: 'radial-gradient(circle, rgba(91,164,212,0.05), transparent 70%)',
          }} />
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Hero Slider - Only show if there are movies */}
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
                width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                background: 'linear-gradient(135deg, #e8b84b, #e8b84b88)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(232,184,75,0.25)',
              }}>
                <RotateCcw size={13} color="#080c14" strokeWidth={2.4} />
              </div>
              <h2 style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: isMobile ? 13 : 14.5,
                fontWeight: 700, color: '#c8d0e0', margin: 0,
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
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
              }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); handleDismissContinue(); }}
                aria-label="Remove from Continue Watching"
                style={{
                  position: 'absolute', top: 10, right: 10, zIndex: 3,
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <X size={14} />
              </button>

              <div style={{
                position: 'relative', flexShrink: 0,
                width: isMobile ? '100%' : 340,
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
                    ? 'linear-gradient(to top, rgba(8,12,20,0.92), rgba(8,12,20,0.05) 60%)'
                    : 'linear-gradient(to right, rgba(8,12,20,0.1), rgba(8,12,20,0.25))',
                }} />
                <div className="cw-play-btn" style={{
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  width: 50, height: 50, borderRadius: '50%',
                  background: 'rgba(232,184,75,0.95)',
                  boxShadow: '0 8px 24px rgba(232,184,75,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Play size={20} fill="#080c14" color="#080c14" style={{ marginLeft: 3 }} />
                </div>
              </div>

              <div style={{ flex: 1, padding: isMobile ? '14px 16px 16px' : '20px 24px', minWidth: 0 }}>
                <h3 style={{
                  fontFamily: "'Playfair Display', serif", fontSize: isMobile ? 18 : 22,
                  fontWeight: 800, color: '#e8eaf0', margin: '0 0 6px', letterSpacing: '-0.3px',
                }}>{continueWatching.media.title}</h3>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#e8b84b',
                  fontWeight: 600, margin: '0 0 8px',
                }}>
                  {continueWatching.season
                    ? `Season ${continueWatching.season} • Episode ${continueWatching.episode}${continueWatching.episodeName ? `: ${continueWatching.episodeName}` : ''}`
                    : (continueWatching.media.year ? `Movie • ${continueWatching.media.year}` : 'Movie')}
                </p>
                {continueWatching.media.synopsis && !isMobile && (
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#6878a0',
                    lineHeight: 1.6, margin: '0 0 14px',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>{continueWatching.media.synopsis}</p>
                )}
                <button
                  className="cw-resume-btn"
                  onClick={(e) => { e.stopPropagation(); handleResumeContinue(); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: '#e8b84b', color: '#080c14', border: 'none',
                    borderRadius: 9, padding: '10px 20px', fontSize: 14, fontWeight: 700,
                    fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
                  }}
                >
                  <Play size={15} fill="#080c14" /> Resume
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ===== MOVIES SECTION ===== */}
        <div style={{ marginTop: movies.length > 0 ? 40 : 0 }}>
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
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                background: 'linear-gradient(135deg, #e8b84b, #c9962e)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 16px rgba(232,184,75,0.3)',
              }}>
                <Film size={16} color="#080c14" strokeWidth={2} />
              </div>
              <h2 style={{
                fontFamily: "'Playfair Display', serif", fontSize: isMobile ? 20 : 24,
                fontWeight: 900, color: '#e8eaf0', margin: 0, letterSpacing: '-0.3px',
              }}>Movies</h2>
            </div>
            <button
              className="hm-explore-btn"
              onClick={() => navigate('/movies')}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                color: '#6878a0', fontWeight: 500, padding: 0,
              }}
            >
              Explore All <ChevronRight size={14} />
            </button>
          </motion.div>

          {movies.length > 0 ? (
            <>
              <ContentRow title="Trending Now" items={trendingMoviesSorted} type="movie" icon={TrendingUp}
                gradient="linear-gradient(135deg, #e8b84b, #e05fa0)" isFirst isMobile={isMobile} />
              {MOVIE_HOME_GENRES.map(g => (
                <ContentRow key={g.name} title={g.name} items={movieGenrePools[g.name]} type="movie"
                  icon={g.icon} gradient={g.gradient} isMobile={isMobile} />
              ))}
            </>
          ) : (
            <div style={{ padding: "40px 16px", textAlign: "center", color: "#888", fontFamily: "'DM Sans', sans-serif" }}>
              <p style={{ fontSize: 16, marginBottom: 8 }}>🎬 No movies available right now.</p>
              <p style={{ fontSize: 14, color: "#555" }}>Check back later for new releases!</p>
            </div>
          )}
        </div>

        {/* ===== SERIES SECTION ===== */}
        <div style={{ marginTop: 16 }}>
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
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                background: 'linear-gradient(135deg, #5ba4d4, #3577a8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 16px rgba(91,164,212,0.3)',
              }}>
                <Tv size={16} color="#080c14" strokeWidth={2} />
              </div>
              <h2 style={{
                fontFamily: "'Playfair Display', serif", fontSize: isMobile ? 20 : 24,
                fontWeight: 900, color: '#e8eaf0', margin: 0, letterSpacing: '-0.3px',
              }}>Series</h2>
            </div>
            <button
              className="hm-explore-btn"
              onClick={() => navigate('/series')}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                color: '#6878a0', fontWeight: 500, padding: 0,
              }}
            >
              Explore All <ChevronRight size={14} />
            </button>
          </motion.div>

          {loadingSeries ? (
            <div style={{ padding: "40px 0", textAlign: "center" }}>
              <p style={{ color: "#888", fontFamily: "'DM Sans', sans-serif", fontSize: 16 }}>
                Loading series...
              </p>
            </div>
          ) : series.length > 0 ? (
            <>
              <ContentRow title="Trending Now" items={trendingSeriesSorted} type="series" icon={TrendingUp}
                gradient="linear-gradient(135deg, #5ba4d4, #e05fa0)" isFirst isMobile={isMobile} />
              {SERIES_HOME_GENRES.map(g => (
                <ContentRow key={g.name} title={g.name} items={seriesGenrePools[g.name]} type="series"
                  icon={g.icon} gradient={g.gradient} isMobile={isMobile} />
              ))}
            </>
          ) : (
            <div style={{ padding: "40px 16px", textAlign: "center", color: "#888", fontFamily: "'DM Sans', sans-serif" }}>
              <p style={{ fontSize: 16, marginBottom: 8 }}>📺 No series available right now.</p>
              <p style={{ fontSize: 14, color: "#555" }}>Popular shows will appear here!</p>
            </div>
          )}
        </div>

        {/* ===== FOOTER SECTION ===== */}
        <div style={{
          marginTop: 60,
          paddingTop: 40,
          paddingLeft: isMobile ? 16 : 32,
          paddingRight: isMobile ? 16 : 32,
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}>
          
          {/* Donation Section */}
          <div style={{
            maxWidth: 500,
            margin: "0 auto 40px",
            background: "rgba(255,255,255,0.03)",
            borderRadius: 20,
            padding: 30,
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(12px)",
            textAlign: "center",
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, margin: "0 auto 16px",
              background: "linear-gradient(135deg, #e8b84b, #c9962e)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 20px rgba(232,184,75,0.3)",
            }}>
              <Heart size={26} color="#080c14" fill="#080c14" />
            </div>
            <h3 style={{
              color: "#e8eaf0",
              fontSize: 22,
              fontWeight: 700,
              margin: "0 0 10px 0",
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Support This Project
            </h3>
            <p style={{
              color: "#6878a0",
              fontSize: 14,
              lineHeight: 1.6,
              marginBottom: 20,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Help me keep the website running and add more features! 
              Every contribution makes a difference. （￣︶￣）
            </p>

            {!showQR ? (
              <button
                onClick={() => setShowQR(true)}
                style={{
                  background: "linear-gradient(135deg, #e8b84b, #c9962e)",
                  color: "#080c14",
                  border: "none",
                  borderRadius: 12,
                  padding: "14px 30px",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  transition: "transform 0.2s",
                }}
                onMouseEnter={(e) => e.target.style.transform = "scale(1.05)"}
                onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
              >
                💰 Support with UPI
              </button>
            ) : (
              <div>
                {/* QR Code */}
                <div style={{
                  width: 180,
                  height: 180,
                  margin: "0 auto 15px",
                  borderRadius: 15,
                  overflow: "hidden",
                  border: "2px solid rgba(255,255,255,0.15)",
                }}>
                  <img 
                    src="/images/donation-qr.jpeg" 
                    alt="UPI QR Code"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888;font-size:14px;">QR Code<br/>Placeholder</div>';
                    }}
                  />
                </div>

                {/* UPI ID */}
                <div style={{
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: 10,
                  padding: "10px 15px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 15,
                  border: "1px solid rgba(255,255,255,0.1)",
                }}>
                  <code style={{
                    color: "#4CAF50",
                    fontSize: 13,
                    fontFamily: "monospace",
                  }}>
                    {Message}
                  </code>
                </div>

                {/* Quick Pay Buttons */}
                <div style={{ marginBottom: 15 }}>
                  <p style={{
                    color: "#666",
                    fontSize: 12,
                    marginBottom: 10,
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                    Suggested amounts:
                  </p>
                  <div style={{
                    display: "flex",
                    gap: 8,
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}>
                    {[10, 50, 100].map(amount => (
                      <button
                        key={amount}
                        onClick={() => openUPIApp(amount)}
                        style={{
                          background: "rgba(255,255,255,0.08)",
                          color: "#fff",
                          border: "1px solid rgba(255,255,255,0.15)",
                          borderRadius: 8,
                          padding: "8px 16px",
                          cursor: "pointer",
                          fontSize: 14,
                          fontWeight: 600,
                          fontFamily: "'DM Sans', sans-serif",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = "rgba(232,184,75,0.2)";
                          e.target.style.borderColor = "#e8b84b";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = "rgba(255,255,255,0.08)";
                          e.target.style.borderColor = "rgba(255,255,255,0.15)";
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
              color: "#555",
              fontSize: 11,
              marginTop: 15,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              🔒 Secure payment • Voluntary contributions only
            </p>
          </div>

          {/* Contact Section */}
          <div style={{
            textAlign: "center",
            marginBottom: 30,
          }}>
            <p style={{
              color: "#888",
              fontSize: 14,
              marginBottom: 12,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              📩 If you encounter any issues, contact me:
            </p>
            <a
              href="https://www.instagram.com/_ut_sr/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
                color: "#fff",
                textDecoration: "none",
                padding: "12px 24px",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                transition: "transform 0.2s, box-shadow 0.2s",
                boxShadow: "0 4px 15px rgba(220, 39, 67, 0.3)",
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "scale(1.05)";
                e.target.style.boxShadow = "0 6px 20px rgba(220, 39, 67, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "scale(1)";
                e.target.style.boxShadow = "0 4px 15px rgba(220, 39, 67, 0.3)";
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              @_ut_sr
            </a>
          </div>

          {/* Developer Credit */}
          <div style={{
            textAlign: "center",
            paddingTop: 20,
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}>
            <p style={{
              color: "#555",
              fontSize: 13,
              fontFamily: "'DM Sans', sans-serif",
              margin: 0,
            }}>
              Developed by{' '}
              <span style={{
                color: "#e8b84b",
                fontWeight: 700,
                letterSpacing: "0.5px",
              }}>
                Uttkarsh
              </span>
              {' '}© {new Date().getFullYear()}
            </p>
            <p style={{
              color: "#444",
              fontSize: 11,
              fontFamily: "'DM Sans', sans-serif",
              marginTop: 5,
            }}>
              All rights reserved. Stream responsibly.
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
    background: linear-gradient(90deg, #0d1420 25%, #1a2235 50%, #0d1420 75%);
    background-size: 200% 100%;
    animation: hm-shimmer 1.4s ease infinite;
  }

  .hm-explore-btn { transition: color 0.2s ease; }
  .hm-explore-btn svg { transition: transform 0.2s ease; }
  @media (hover: hover) and (pointer: fine) {
    .hm-explore-btn:hover { color: #e8eaf0 !important; }
    .hm-explore-btn:hover svg { transform: translateX(3px); }
  }

  .cw-resume-btn { transition: transform 0.15s ease, box-shadow 0.15s ease; }
  @media (hover: hover) and (pointer: fine) {
    .cw-resume-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(232,184,75,0.35); }
  }

  /* Continue Watching card */
  @media (hover: hover) and (pointer: fine) {
    .cw-card { transition: border-color 0.2s ease, transform 0.2s ease; }
    .cw-card:hover { border-color: rgba(232,184,75,0.35) !important; transform: translateY(-2px); }
    .cw-card:hover .cw-play-btn { transform: translate(-50%, -50%) scale(1.1); }
  }
  .cw-play-btn { transition: transform 0.2s ease; }

  /* Netflix-style hover zoom on cards (desktop only, mouse-capable) */
  @media (hover: hover) and (pointer: fine) {
    .hm-card {
      transition: transform 0.28s cubic-bezier(0.25, 0.8, 0.25, 1);
      transform-origin: center center;
    }
    .hm-card:hover {
      transform: scale(1.08);
      z-index: 5;
      position: relative;
    }
  }

  /* Row scroll arrows */
  .hm-arrow {
    position: absolute; top: 0; bottom: 12px;
    width: 44px; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(90deg, #080c14 10%, transparent);
    border: none; color: #e8eaf0; cursor: pointer;
    opacity: 0; transition: opacity 0.2s ease;
    z-index: 6;
  }
  .hm-arrow-r { right: 0; background: linear-gradient(270deg, #080c14 10%, transparent); }
  .hm-arrow-l { left: 0; }
  .hm-row:hover .hm-arrow { opacity: 1; }

  .hm-row-wrap ::-webkit-scrollbar { height: 0; width: 0; }
`;