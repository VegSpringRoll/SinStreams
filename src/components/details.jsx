import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  Play, Plus, Check, Star, Clock, Calendar, Film, Tv,
  X, Video, Globe, Users, DollarSign, ExternalLink, ArrowLeft, ChevronDown
} from 'lucide-react';
import { useUser } from '@clerk/clerk-react';

const BACKEND_URL = import.meta.env.PROD ? "/api" : "http://localhost:5000/api";
const TMDB_API_KEY = '8ade991ea509eefe3cca2142132d753a';

// ─── Helpers ───
const formatRuntime = (minutes) => {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

const formatCurrency = (amount) => {
  if (!amount) return null;
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
};

const LANGUAGE_NAMES = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
  ja: 'Japanese', ko: 'Korean', zh: 'Chinese', hi: 'Hindi', ru: 'Russian',
  pt: 'Portuguese', ar: 'Arabic', tr: 'Turkish', th: 'Thai',
};

// Same accent language as HeroSlider / genre rows, so this page feels like
// part of the same app instead of a bolted-on Netflix-red template page.
const TYPE_CONFIG = {
  movie:  { label: 'FILM',   accent: '#e8b84b', glow: 'rgba(232,184,75,0.22)' },
  series: { label: 'SERIES', accent: '#5ba4d4', glow: 'rgba(91,164,212,0.22)' },
};

export default function Details() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();

  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistBusy, setWatchlistBusy] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [posterLoaded, setPosterLoaded] = useState(false);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    fetchDetails();
    setSynopsisExpanded(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, id]);

  // Close trailer modal with Escape key
  useEffect(() => {
    if (!showTrailer) return;
    const onKey = (e) => e.key === 'Escape' && setShowTrailer(false);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [showTrailer]);

  const pickTrailer = (videos) => {
    if (!videos?.results?.length) return null;
    const yt = videos.results.filter(v => v.site === 'YouTube');
    return (
      yt.find(v => v.type === 'Trailer' && v.official) ||
      yt.find(v => v.type === 'Trailer') ||
      yt.find(v => v.type === 'Teaser') ||
      yt[0] ||
      null
    );
  };

  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      setPosterLoaded(false);

      if (type === 'movie') {
        const { data } = await axios.get(`https://api.themoviedb.org/3/movie/${id}`, {
          params: { api_key: TMDB_API_KEY, append_to_response: 'credits,videos,external_ids' }
        });

        const trailer = pickTrailer(data.videos);

        setMedia({
          _id: String(data.id),
          imdb_id: data.imdb_id || data.external_ids?.imdb_id,
          title: data.title,
          type: 'movie',
          year: data.release_date?.substring(0, 4),
          releaseDateFull: data.release_date,
          rating: { percentage: Math.round(data.vote_average * 10), votes: data.vote_count },
          runtime: data.runtime,
          genres: data.genres?.map(g => g.name) || [],
          synopsis: data.overview,
          tagline: data.tagline,
          status: data.status,
          originalLanguage: LANGUAGE_NAMES[data.original_language] || data.original_language?.toUpperCase(),
          spokenLanguages: data.spoken_languages?.map(l => l.english_name).filter(Boolean),
          homepage: data.homepage,
          productionCompanies: data.production_companies?.map(c => c.name).filter(Boolean).slice(0, 4),
          images: {
            poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
            fanart: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : null,
          },
          cast: data.credits?.cast?.slice(0, 12).map(c => ({ name: c.name, character: c.character, image: c.profile_path })),
          director: data.credits?.crew?.find(c => c.job === 'Director')?.name,
          writers: [...new Set(
            data.credits?.crew
              ?.filter(c => ['Screenplay', 'Writer', 'Story'].includes(c.job))
              ?.map(c => c.name)
          )].slice(0, 3),
          budget: data.budget,
          revenue: data.revenue,
          trailerKey: trailer?.key || null,
          trailerName: trailer?.name || null,
        });
      } else if (type === 'tv' || type === 'series') {
        const { data } = await axios.get(`https://api.themoviedb.org/3/tv/${id}`, {
          params: { api_key: TMDB_API_KEY, append_to_response: 'credits,videos,external_ids' }
        });

        const trailer = pickTrailer(data.videos);

        setMedia({
          _id: String(data.id),
          imdb_id: data.external_ids?.imdb_id,
          title: data.name,
          type: 'series',
          year: data.first_air_date?.substring(0, 4),
          releaseDateFull: data.first_air_date,
          rating: { percentage: Math.round(data.vote_average * 10), votes: data.vote_count },
          seasons: data.number_of_seasons,
          episodes: data.number_of_episodes,
          genres: data.genres?.map(g => g.name) || [],
          synopsis: data.overview,
          tagline: data.tagline,
          status: data.status,
          originalLanguage: LANGUAGE_NAMES[data.original_language] || data.original_language?.toUpperCase(),
          spokenLanguages: data.spoken_languages?.map(l => l.english_name).filter(Boolean),
          homepage: data.homepage,
          networks: data.networks?.map(n => n.name).filter(Boolean),
          productionCompanies: data.production_companies?.map(c => c.name).filter(Boolean).slice(0, 4),
          nextEpisodeDate: data.next_episode_to_air?.air_date,
          lastAirDate: data.last_air_date,
          images: {
            poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
            fanart: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : null,
          },
          cast: data.credits?.cast?.slice(0, 12).map(c => ({ name: c.name, character: c.character, image: c.profile_path })),
          created_by: data.created_by?.map(c => c.name).join(', '),
          trailerKey: trailer?.key || null,
          trailerName: trailer?.name || null,
        });
      }

      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch details:", err);
      setError("Failed to load details");
      setLoading(false);
    }
  };

  const handleWatchlist = async () => {
    if (!user) return alert("Please sign in to use your watchlist");
    if (watchlistBusy) return;

    try {
      setWatchlistBusy(true);
      if (inWatchlist) {
        await axios.delete(`${BACKEND_URL}/user/watchlist/${user.id}/${media._id}`);
      } else {
        await axios.post(`${BACKEND_URL}/user/watchlist`, {
          clerkId: user.id,
          media: {
            _id: media._id,
            imdb_id: media.imdb_id,
            type: media.type,
            title: media.title,
            images: { poster: media.images?.poster }
          }
        });
      }
      setInWatchlist(!inWatchlist);
    } catch (err) {
      console.error("Watchlist error:", err);
    } finally {
      setWatchlistBusy(false);
    }
  };

  const handlePlay = useCallback(() => {
    navigate(`/watch/${media.type}/${media._id}`, { state: { media, autoPlay: true } });
  }, [media, navigate]);

  const cfg = TYPE_CONFIG[media?.type] || TYPE_CONFIG.movie;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-content" style={{ minHeight: '100vh', background: '#080c14' }}>
        <style>{PAGE_CSS}</style>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p style={{ color: '#6878a0', fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>Loading details...</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error || !media) {
    return (
      <div className="page-content" style={{ minHeight: '100vh', background: '#080c14' }}>
        <style>{PAGE_CSS}</style>
        <div style={styles.loadingContainer}>
          <p style={{ color: '#c8d0e0', fontSize: 16, fontFamily: "'DM Sans', sans-serif" }}>{error || 'Not found'}</p>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>
            <ArrowLeft size={15} /> Go Back
          </button>
        </div>
      </div>
    );
  }

  const runtimeLabel = formatRuntime(media.runtime);
  const posterW = isMobile ? 168 : 300;
  const posterH = Math.round(posterW * 1.5);

  // Data-driven credit cells for the info panel
  const creditItems = [
    media.director && { label: 'Director', value: media.director },
    media.created_by && { label: 'Created by', value: media.created_by },
    media.writers?.length > 0 && { label: 'Writers', value: media.writers.join(', ') },
    media.networks?.length > 0 && { label: 'Network', value: media.networks.join(', ') },
    media.originalLanguage && { label: 'Language', value: media.originalLanguage },
    media.productionCompanies?.length > 0 && { label: 'Studio', value: media.productionCompanies.join(', ') },
    formatCurrency(media.budget) && { label: 'Budget', value: formatCurrency(media.budget), icon: DollarSign },
    formatCurrency(media.revenue) && { label: 'Revenue', value: formatCurrency(media.revenue), icon: DollarSign },
  ].filter(Boolean);

  return (
    <>
      <style>{PAGE_CSS}</style>

      <div className="page-content" style={{ minHeight: '100vh', background: '#080c14', position: 'relative' }}>
        {/* ── Cinematic backdrop ── */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: isMobile ? 380 : 640, overflow: 'hidden' }}>
          {media.images?.fanart && (
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${media.images.fanart})`,
              backgroundSize: 'cover', backgroundPosition: 'center top',
            }} />
          )}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(8,12,20,0.35) 0%, rgba(8,12,20,0.88) 60%, #080c14 100%)',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse 55% 45% at 82% 15%, ${cfg.glow}, transparent)`,
          }} />
        </div>

        {/* ── Content ── */}
        <div style={{
          position: 'relative', zIndex: 1,
          maxWidth: 1200, margin: '0 auto',
          padding: isMobile ? '84px 16px 48px' : '124px 40px 64px',
        }}>
          <button onClick={() => navigate(-1)} style={styles.backBtn} className="det-glass">
            <ArrowLeft size={15} /> Back
          </button>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'center' : 'flex-start',
              gap: isMobile ? 24 : 40,
            }}
          >
            {/* ── Poster ── */}
            <div style={{ flexShrink: 0, position: 'relative' }}>
              <div style={{
                width: posterW, height: posterH,
                borderRadius: 16, overflow: 'hidden',
                border: `1px solid ${cfg.accent}33`,
                boxShadow: `0 20px 50px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)`,
                background: '#0d1420',
                position: 'relative',
              }}>
                {media.images?.poster ? (
                  <>
                    {!posterLoaded && <div className="det-skeleton" style={{ position: 'absolute', inset: 0 }} />}
                    <img
                      src={media.images.poster}
                      alt={media.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: posterLoaded ? 'block' : 'none' }}
                      onLoad={() => setPosterLoaded(true)}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </>
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3a4560' }}>
                    {media.type === 'series' ? <Tv size={40} /> : <Film size={40} />}
                  </div>
                )}
              </div>
            </div>

            {/* ── Info ── */}
            <div style={{ flex: 1, minWidth: 0, width: '100%', textAlign: isMobile ? 'center' : 'left' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                justifyContent: isMobile ? 'center' : 'flex-start',
                marginBottom: 14, flexWrap: 'wrap',
              }}>
                <span className="det-tag" style={{ background: `${cfg.accent}1f`, border: `1px solid ${cfg.accent}55`, color: cfg.accent }}>
                  {cfg.label}
                </span>
                {media.status && (
                  <span className="det-tag" style={{ background: 'rgba(90,180,120,0.15)', border: '1px solid rgba(90,180,120,0.35)', color: '#7fd19c' }}>
                    {media.status}
                  </span>
                )}
              </div>

              <h1 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: isMobile ? 'clamp(24px, 7vw, 32px)' : 'clamp(32px, 4vw, 50px)',
                fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.02em',
                margin: '0 0 10px',
                backgroundImage: `linear-gradient(135deg, #fdfdfd, ${cfg.accent}bb)`,
                WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
                textShadow: '0 2px 30px rgba(0,0,0,0.4)',
              }}>{media.title}</h1>

              {media.tagline && (
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: isMobile ? 14 : 16, color: '#6878a0', fontStyle: 'italic', margin: '0 0 16px' }}>
                  "{media.tagline}"
                </p>
              )}

              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16,
                justifyContent: isMobile ? 'center' : 'flex-start',
              }}>
                {media.rating && media.rating.percentage > 0 && (
                  <span className="det-chip" style={{ color: '#e8b84b' }}>
                    <Star size={13} fill="#e8b84b" color="#e8b84b" /> {(media.rating.percentage / 10).toFixed(1)}
                  </span>
                )}
                {media.year && <span className="det-chip"><Calendar size={13} /> {media.year}</span>}
                {runtimeLabel && <span className="det-chip"><Clock size={13} /> {runtimeLabel}</span>}
                {media.seasons && (
                  <span className="det-chip">{media.seasons} Season{media.seasons > 1 ? 's' : ''} • {media.episodes} Episodes</span>
                )}
              </div>

              <div style={{
                display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20,
                justifyContent: isMobile ? 'center' : 'flex-start',
              }}>
                {media.genres?.map(g => (
                  <span key={g} className="det-genre" style={{ borderColor: `${cfg.accent}33` }}>{g}</span>
                ))}
              </div>

              {media.synopsis && (
                <div style={{ marginBottom: 22, maxWidth: isMobile ? '100%' : 640, marginLeft: isMobile ? 'auto' : 0, marginRight: isMobile ? 'auto' : 0 }}>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: isMobile ? 13.5 : 15,
                    color: '#8892a4', lineHeight: 1.75, margin: 0,
                    display: synopsisExpanded ? 'block' : '-webkit-box',
                    WebkitLineClamp: synopsisExpanded ? 'unset' : 4,
                    WebkitBoxOrient: 'vertical',
                    overflow: synopsisExpanded ? 'visible' : 'hidden',
                  }}>{media.synopsis}</p>
                  {media.synopsis.length > 220 && (
                    <button
                      onClick={() => setSynopsisExpanded(v => !v)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 6,
                        display: 'flex', alignItems: 'center', gap: 4,
                        color: cfg.accent, fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
                        marginLeft: isMobile ? 'auto' : 0, marginRight: isMobile ? 'auto' : 0,
                      }}
                    >
                      {synopsisExpanded ? 'Show less' : 'Read more'}
                      <ChevronDown size={14} style={{ transform: synopsisExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </button>
                  )}
                </div>
              )}

              {creditItems.length > 0 && (
                <div className="det-glass" style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '14px 24px',
                  padding: '18px 20px',
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                  marginBottom: 26,
                  textAlign: 'left',
                }}>
                  {creditItems.map((c, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                      <span style={{
                        fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600,
                        color: '#4a5878', textTransform: 'uppercase', letterSpacing: '0.08em',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}>
                        {c.icon && <c.icon size={11} />}
                        {c.label}
                      </span>
                      <span style={{
                        fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, color: '#c8d0e0',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{c.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Actions ── */}
              {isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={handlePlay} className="det-btn" style={{
                      flex: 1, height: 46, borderRadius: 10,
                      background: `linear-gradient(135deg, ${cfg.accent}, ${cfg.accent}cc)`,
                      color: '#0a0a0a', fontWeight: 700, boxShadow: `0 8px 24px ${cfg.glow}`,
                    }}>
                      <Play size={17} fill="currentColor" /> Play Now
                    </button>
                    <button
                      onClick={handleWatchlist}
                      disabled={watchlistBusy}
                      className="det-btn det-glass"
                      aria-label={inWatchlist ? 'In List' : 'My List'}
                      style={{
                        width: 46, height: 46, borderRadius: 10, flexShrink: 0,
                        background: inWatchlist ? `${cfg.accent}22` : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${inWatchlist ? cfg.accent + '66' : 'rgba(255,255,255,0.14)'}`,
                        color: inWatchlist ? cfg.accent : '#c8d0e0',
                        opacity: watchlistBusy ? 0.6 : 1,
                      }}
                    >
                      {inWatchlist ? <Check size={18} /> : <Plus size={18} />}
                    </button>
                  </div>
                  {(media.trailerKey || media.imdb_id) && (
                    <div style={{ display: 'flex', gap: 10 }}>
                      {media.trailerKey && (
                        <button onClick={() => setShowTrailer(true)} className="det-btn det-glass" style={{
                          flex: 1, height: 42, borderRadius: 10,
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#c8d0e0',
                        }}>
                          <Video size={16} /> Trailer
                        </button>
                      )}
                      {media.imdb_id && (
                        <a href={`https://www.imdb.com/title/${media.imdb_id}`} target="_blank" rel="noopener noreferrer"
                          className="det-btn" style={{
                            flex: 1, height: 42, borderRadius: 10, textDecoration: 'none',
                            background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.3)', color: '#f5c518',
                          }}>
                          <ExternalLink size={14} /> IMDb
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button onClick={handlePlay} className="det-btn" style={{
                    padding: '13px 32px', borderRadius: 10,
                    background: `linear-gradient(135deg, ${cfg.accent}, ${cfg.accent}cc)`,
                    color: '#0a0a0a', fontWeight: 700, boxShadow: `0 8px 24px ${cfg.glow}`,
                  }}>
                    <Play size={18} fill="currentColor" /> Play Now
                  </button>

                  {media.trailerKey && (
                    <button onClick={() => setShowTrailer(true)} className="det-btn det-glass" style={{
                      padding: '13px 24px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#c8d0e0',
                    }}>
                      <Video size={17} /> Trailer
                    </button>
                  )}

                  <button
                    onClick={handleWatchlist}
                    disabled={watchlistBusy}
                    className="det-btn det-glass"
                    style={{
                      padding: '13px 24px', borderRadius: 10,
                      background: inWatchlist ? `${cfg.accent}22` : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${inWatchlist ? cfg.accent + '66' : 'rgba(255,255,255,0.14)'}`,
                      color: inWatchlist ? cfg.accent : '#c8d0e0',
                      opacity: watchlistBusy ? 0.6 : 1,
                    }}
                  >
                    {inWatchlist ? <Check size={17} /> : <Plus size={17} />}
                    {inWatchlist ? 'In List' : 'My List'}
                  </button>

                  {media.imdb_id && (
                    <a href={`https://www.imdb.com/title/${media.imdb_id}`} target="_blank" rel="noopener noreferrer"
                      className="det-btn" style={{
                        padding: '13px 20px', borderRadius: 10, textDecoration: 'none',
                        background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.3)', color: '#f5c518',
                      }}>
                      <ExternalLink size={15} /> IMDb
                    </a>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* ── Cast ── */}
          {media.cast && media.cast.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              style={{ marginTop: isMobile ? 40 : 56 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                  background: `linear-gradient(135deg, ${cfg.accent}, ${cfg.accent}88)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Users size={13} color="#0a0a0a" />
                </div>
                <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: isMobile ? 16 : 18, fontWeight: 700, color: '#e8eaf0', margin: 0 }}>
                  Cast
                </h2>
              </div>
              <div className="hide-scrollbar" style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 10 }}>
                {media.cast.map((actor, i) => (
                  <div key={i} className="det-cast-card" style={{ flexShrink: 0, width: isMobile ? 88 : 110, textAlign: 'center' }}>
                    <div className="det-cast-avatar" style={{
                      width: isMobile ? 72 : 84, height: isMobile ? 72 : 84, borderRadius: '50%',
                      margin: '0 auto 8px', overflow: 'hidden',
                      background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(255,255,255,0.1)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {actor.image ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w200${actor.image}`}
                          alt={actor.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{ fontSize: 20 }}>👤</span>
                      )}
                    </div>
                    <p style={{
                      fontFamily: "'DM Sans', sans-serif", fontSize: 12.5, color: '#c8d0e0', fontWeight: 500,
                      margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{actor.name}</p>
                    <p style={{
                      fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#4a5878',
                      margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{actor.character}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Footer info ── */}
          {media.homepage && (
            <div style={{ marginTop: 36, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <a href={media.homepage} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                color: '#6878a0', fontFamily: "'DM Sans', sans-serif", fontSize: 13, textDecoration: 'none',
              }}>
                <Globe size={14} /> Official Site
              </a>
            </div>
          )}
        </div>

        {/* ── Trailer Modal ── */}
        {showTrailer && media.trailerKey && (
          <div className="det-trailer-overlay" style={styles.trailerOverlay} onClick={() => setShowTrailer(false)}>
            <div style={{ position: 'relative', width: 900, maxWidth: '100%' }} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowTrailer(false)} className="det-glass" style={styles.trailerCloseBtn} aria-label="Close trailer">
                <X size={20} />
              </button>
              <div style={{
                position: 'relative', width: '100%', paddingTop: '56.25%',
                background: '#000', borderRadius: 14, overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              }}>
                <iframe
                  src={`https://www.youtube.com/embed/${media.trailerKey}?autoplay=1&rel=0&modestbranding=1`}
                  title={media.trailerName || `${media.title} Trailer`}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const PAGE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes detFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes detShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

  .det-skeleton {
    background: linear-gradient(90deg, #0d1420 25%, #1a2235 50%, #0d1420 75%);
    background-size: 200% 100%;
    animation: detShimmer 1.4s ease infinite;
  }

  .det-glass {
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .det-tag {
    font-family: 'DM Sans', sans-serif;
    font-size: 10px; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    padding: 4px 10px; border-radius: 5px;
  }

  .det-chip {
    display: inline-flex; align-items: center; gap: 5px;
    font-family: 'DM Sans', sans-serif; font-size: 13px; color: #8892a4;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
    padding: 5px 11px; border-radius: 20px;
  }

  .det-genre {
    font-family: 'DM Sans', sans-serif; font-size: 12.5px; color: #aab2c8;
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
    padding: 6px 14px; border-radius: 20px;
  }

  .det-btn {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    border: none; cursor: pointer; font-family: 'DM Sans', sans-serif;
    font-size: 14.5px; font-weight: 600; transition: all 0.2s ease;
  }
  .det-btn:hover  { opacity: 0.9; transform: translateY(-1px); }
  .det-btn:active { transform: translateY(0) scale(0.97); }
  .det-btn:disabled { cursor: default; }

  @media (hover: hover) and (pointer: fine) {
    .det-cast-card { transition: transform 0.2s ease; }
    .det-cast-card:hover { transform: translateY(-3px); }
    .det-cast-card:hover .det-cast-avatar { border-color: rgba(255,255,255,0.25); }
  }

  .det-trailer-overlay { animation: detFadeIn 0.15s ease-out; }
`;

const styles = {
  loadingContainer: {
    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
    height: '100vh', gap: 16,
  },
  spinner: {
    width: 44, height: 44,
    border: '3px solid rgba(255,255,255,0.08)',
    borderTop: '3px solid #e8b84b',
    borderRadius: '50%',
    animation: 'spin 0.9s linear infinite',
  },
  backBtn: {
    display: 'flex', alignItems: 'center', gap: 7,
    background: 'rgba(255,255,255,0.06)', color: '#c8d0e0',
    border: '1px solid rgba(255,255,255,0.12)',
    padding: '9px 16px', borderRadius: 9, cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, fontWeight: 500,
    marginBottom: 28,
  },
  trailerOverlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(4,6,10,0.9)',
    backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
    zIndex: 10000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
  },
  trailerCloseBtn: {
    position: 'absolute', top: -44, right: 0,
    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)',
    color: '#fff', width: 36, height: 36, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  },
};