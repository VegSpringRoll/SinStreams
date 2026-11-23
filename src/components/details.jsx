import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  Play, Plus, Check, Star, Clock, Calendar, Film, Tv,
  X, Video, Globe, Users, DollarSign, ExternalLink, ArrowLeft, ChevronDown, Sparkles
} from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { getAnimeDetails, resolveEpisodeCount } from '../../services/animeService';
import { recordHistoryItem } from '../../services/indexedDbHistory';

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

// Pure monochrome type config
const TYPE_CONFIG = {
  movie:  { label: 'FILM',   accent: '#ffffff', glow: 'rgba(255,255,255,0.2)' },
  series: { label: 'SERIES', accent: '#e4e4e7', glow: 'rgba(255,255,255,0.18)' },
  anime:  { label: 'ANIME',  accent: '#ffffff', glow: 'rgba(255,255,255,0.22)' },
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

      if (type === 'anime') {
        const animeData = await getAnimeDetails(id);
        if (!animeData) throw new Error("Anime not found");

        const formattedMedia = {
          _id: String(animeData.id),
          id: String(animeData.id),
          anilist_id: animeData.anilist_id || animeData.id,
          mal_id: animeData.mal_id,
          title: animeData.title,
          originalTitle: animeData.originalTitle,
          type: 'anime',
          format: animeData.format || 'TV',
          year: animeData.year,
          releaseDateFull: animeData.year,
          rating: animeData.rating,
          runtime: animeData.duration ? parseInt(animeData.duration, 10) : 24,
          genres: animeData.genres || [],
          synopsis: animeData.synopsis,
          tagline: animeData.format ? `${animeData.format} Series` : 'Anime Series',
          images: {
            poster: animeData.images?.poster,
            fanart: animeData.images?.fanart || animeData.images?.backdrop,
          },
          status: animeData.status,
          episodes: resolveEpisodeCount(animeData),
          originalLanguage: 'Japanese',
          productionCompanies: animeData.studios || [],
          cast: animeData.characters?.slice(0, 8).map(c => ({
            name: c.name,
            character: 'Main Character',
            image: c.image ? c.image.replace('https://image.tmdb.org/t/p/w185', '') : null,
            fullImageUrl: c.image,
          })) || [],
          trailerKey: animeData.trailerKey,
          trailerName: `${animeData.title} Official Trailer`,
        };

        setMedia(formattedMedia);
        recordHistoryItem(formattedMedia).catch(() => {});
      } else if (type === 'movie') {
        const { data } = await axios.get(`https://api.themoviedb.org/3/movie/${id}`, {
          params: { api_key: TMDB_API_KEY, append_to_response: 'credits,videos,external_ids' }
        });

        const trailer = pickTrailer(data.videos);

        const movieMedia = {
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
          images: {
            poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
            fanart: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : null,
          },
          status: data.status,
          budget: data.budget,
          revenue: data.revenue,
          originalLanguage: LANGUAGE_NAMES[data.original_language] || data.original_language?.toUpperCase(),
          productionCompanies: data.production_companies?.slice(0, 3).map(c => c.name) || [],
          director: data.credits?.crew?.find(c => c.job === 'Director')?.name,
          writers: data.credits?.crew?.filter(c => ['Screenplay', 'Writer'].includes(c.job)).slice(0, 2).map(c => c.name) || [],
          cast: data.credits?.cast?.slice(0, 10).map(c => ({
            name: c.name,
            character: c.character,
            image: c.profile_path,
          })) || [],
          trailerKey: trailer?.key,
          trailerName: trailer?.name,
          homepage: data.homepage,
        };

        setMedia(movieMedia);
        recordHistoryItem(movieMedia).catch(() => {});
      } else {
        const { data } = await axios.get(`https://api.themoviedb.org/3/tv/${id}`, {
          params: { api_key: TMDB_API_KEY, append_to_response: 'credits,videos,external_ids' }
        });

        const trailer = pickTrailer(data.videos);

        const seriesMedia = {
          _id: String(data.id),
          imdb_id: data.external_ids?.imdb_id,
          title: data.name,
          type: 'series',
          year: data.first_air_date?.substring(0, 4),
          releaseDateFull: data.first_air_date,
          rating: { percentage: Math.round(data.vote_average * 10), votes: data.vote_count },
          runtime: data.episode_run_time?.[0] || null,
          genres: data.genres?.map(g => g.name) || [],
          synopsis: data.overview,
          tagline: data.tagline,
          images: {
            poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
            fanart: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : null,
          },
          status: data.status,
          seasons: data.number_of_seasons,
          episodes: data.number_of_episodes,
          originalLanguage: LANGUAGE_NAMES[data.original_language] || data.original_language?.toUpperCase(),
          networks: data.networks?.slice(0, 2).map(n => n.name) || [],
          created_by: data.created_by?.map(c => c.name).join(', '),
          cast: data.credits?.cast?.slice(0, 10).map(c => ({
            name: c.name,
            character: c.character,
            image: c.profile_path,
          })) || [],
          trailerKey: trailer?.key,
          trailerName: trailer?.name,
          homepage: data.homepage,
        };

        setMedia(seriesMedia);
        recordHistoryItem(seriesMedia).catch(() => {});
      }
    } catch (err) {
      console.error("Failed to fetch details:", err);
      setError("Failed to load details. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !media) return;
    const checkWatchlist = async () => {
      try {
        const { data } = await axios.get(`${BACKEND_URL}/user/watchlist/${user.id}`);
        const found = data?.some(item => String(item._id) === String(media._id) || String(item.imdb_id) === String(media.imdb_id));
        setInWatchlist(!!found);
      } catch (err) {
        console.error("Watchlist check error:", err);
      }
    };
    checkWatchlist();
  }, [user, media]);

  const handleWatchlist = async () => {
    if (!user) { alert("Please sign in to add to your list"); return; }
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
      <div className="page-content" style={{ minHeight: '100vh', background: '#030304' }}>
        <style>{PAGE_CSS}</style>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p style={{ color: '#a1a1aa', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14 }}>Retrieving details...</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error || !media) {
    return (
      <div className="page-content" style={{ minHeight: '100vh', background: '#030304' }}>
        <style>{PAGE_CSS}</style>
        <div style={styles.loadingContainer}>
          <p style={{ color: '#ffffff', fontSize: 16, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{error || 'Title not found'}</p>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>
            <ArrowLeft size={15} /> Return
          </button>
        </div>
      </div>
    );
  }

  const runtimeLabel = formatRuntime(media.runtime);
  const posterW = isMobile ? 180 : 300;
  const posterH = Math.round(posterW * 1.5);

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

      <div className="page-content" style={{ minHeight: '100vh', background: '#030304', position: 'relative' }}>
        {/* ── Cinematic Pure Monochrome Backdrop ── */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: isMobile ? 400 : 660, overflow: 'hidden' }}>
          {media.images?.fanart && (
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${media.images.fanart})`,
              backgroundSize: 'cover', backgroundPosition: 'center top',
              filter: 'grayscale(25%) brightness(0.75)',
            }} />
          )}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(3,3,4,0.4) 0%, rgba(3,3,4,0.85) 60%, #030304 100%)',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse 65% 50% at 80% 20%, rgba(255, 255, 255, 0.06), transparent 75%)',
          }} />
        </div>

        {/* ── Content ── */}
        <div style={{
          position: 'relative', zIndex: 1,
          maxWidth: 1200, margin: '0 auto',
          padding: isMobile ? '80px 16px 48px' : '110px 40px 64px',
        }}>
          <button onClick={() => navigate(-1)} style={styles.backBtn} className="det-glass">
            <ArrowLeft size={15} /> Return
          </button>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'center' : 'flex-start',
              gap: isMobile ? 24 : 44,
            }}
          >
            {/* ── Poster ── */}
            <div style={{ flexShrink: 0, position: 'relative' }}>
              <div style={{
                width: posterW, height: posterH,
                borderRadius: 16, overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 25px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.2)',
                background: '#0a0a0e',
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
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717a' }}>
                    {media.type === 'series' ? <Tv size={42} /> : <Film size={42} />}
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
                <span className="det-tag" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.22)', color: '#ffffff' }}>
                  {cfg.label}
                </span>
                {media.status && (
                  <span className="det-tag" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.14)', color: '#d4d4d8' }}>
                    {media.status}
                  </span>
                )}
              </div>

              <h1 style={{
                fontFamily: "'Cinzel', 'Playfair Display', serif",
                fontSize: isMobile ? 'clamp(26px, 7vw, 34px)' : 'clamp(32px, 4vw, 50px)',
                fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.02em',
                margin: '0 0 10px',
                color: '#ffffff',
                textShadow: '0 2px 30px rgba(0,0,0,0.6), 0 0 20px rgba(255,255,255,0.15)',
              }}>{media.title}</h1>

              {media.tagline && (
                <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: isMobile ? 14 : 15.5, color: '#a1a1aa', fontStyle: 'italic', margin: '0 0 16px' }}>
                  "{media.tagline}"
                </p>
              )}

              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 18,
                justifyContent: isMobile ? 'center' : 'flex-start',
              }}>
                {media.rating && media.rating.percentage > 0 && (
                  <span className="det-chip" style={{ color: '#ffffff' }}>
                    <Star size={13} fill="#ffffff" color="#ffffff" /> {(media.rating.percentage / 10).toFixed(1)}
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
                  <span key={g} className="det-genre">{g}</span>
                ))}
              </div>

              {media.synopsis && (
                <div style={{ marginBottom: 24, maxWidth: isMobile ? '100%' : 680, marginLeft: isMobile ? 'auto' : 0, marginRight: isMobile ? 'auto' : 0 }}>
                  <p style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: isMobile ? 13.5 : 15,
                    color: '#d4d4d8', lineHeight: 1.75, margin: 0,
                    display: synopsisExpanded ? 'block' : '-webkit-box',
                    WebkitLineClamp: synopsisExpanded ? 'unset' : 4,
                    WebkitBoxOrient: 'vertical',
                    overflow: synopsisExpanded ? 'visible' : 'hidden',
                  }}>{media.synopsis}</p>
                  {media.synopsis.length > 220 && (
                    <button
                      onClick={() => setSynopsisExpanded(v => !v)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 8,
                        display: 'flex', alignItems: 'center', gap: 4,
                        color: '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 600,
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
                  padding: '18px 22px',
                  borderRadius: 14,
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  background: 'rgba(18, 18, 24, 0.65)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  marginBottom: 26,
                  textAlign: 'left',
                }}>
                  {creditItems.map((c, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                      <span style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 10.5, fontWeight: 600,
                        color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.08em',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}>
                        {c.icon && <c.icon size={11} />}
                        {c.label}
                      </span>
                      <span style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13.5, color: '#ffffff',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500,
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
                      flex: 1, height: 48, borderRadius: 11,
                      background: '#ffffff',
                      color: '#030304', fontWeight: 700, boxShadow: '0 0 20px rgba(255, 255, 255, 0.25)',
                    }}>
                      <Play size={18} fill="#030304" color="#030304" /> Play Now
                    </button>
                    <button
                      onClick={handleWatchlist}
                      disabled={watchlistBusy}
                      className="det-btn det-glass"
                      aria-label={inWatchlist ? 'In List' : 'My List'}
                      style={{
                        width: 48, height: 48, borderRadius: 11, flexShrink: 0,
                        background: inWatchlist ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
                        border: `1px solid ${inWatchlist ? '#ffffff' : 'rgba(255, 255, 255, 0.2)'}`,
                        color: inWatchlist ? '#030304' : '#ffffff',
                        opacity: watchlistBusy ? 0.6 : 1,
                      }}
                    >
                      {inWatchlist ? <Check size={18} strokeWidth={2.5} /> : <Plus size={18} strokeWidth={2.5} />}
                    </button>
                  </div>
                  {(media.trailerKey || media.imdb_id) && (
                    <div style={{ display: 'flex', gap: 10 }}>
                      {media.trailerKey && (
                        <button onClick={() => setShowTrailer(true)} className="det-btn det-glass" style={{
                          flex: 1, height: 44, borderRadius: 11,
                          background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.16)', color: '#ffffff',
                        }}>
                          <Video size={16} /> Trailer
                        </button>
                      )}
                      {media.imdb_id && (
                        <a href={`https://www.imdb.com/title/${media.imdb_id}`} target="_blank" rel="noopener noreferrer"
                          className="det-btn det-glass" style={{
                            flex: 1, height: 44, borderRadius: 11, textDecoration: 'none',
                            background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.16)', color: '#ffffff',
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
                    padding: '14px 34px', borderRadius: 11,
                    background: '#ffffff',
                    color: '#030304', fontWeight: 700, boxShadow: '0 0 25px rgba(255, 255, 255, 0.3)',
                  }}>
                    <Play size={18} fill="#030304" color="#030304" /> Play Now
                  </button>

                  {media.trailerKey && (
                    <button onClick={() => setShowTrailer(true)} className="det-btn det-glass" style={{
                      padding: '14px 26px', borderRadius: 11,
                      background: 'rgba(255, 255, 255, 0.07)', border: '1px solid rgba(255, 255, 255, 0.18)', color: '#ffffff',
                    }}>
                      <Video size={17} /> Trailer
                    </button>
                  )}

                  <button
                    onClick={handleWatchlist}
                    disabled={watchlistBusy}
                    className="det-btn det-glass"
                    style={{
                      padding: '14px 26px', borderRadius: 11,
                      background: inWatchlist ? '#ffffff' : 'rgba(255, 255, 255, 0.07)',
                      border: `1px solid ${inWatchlist ? '#ffffff' : 'rgba(255, 255, 255, 0.18)'}`,
                      color: inWatchlist ? '#030304' : '#ffffff',
                      opacity: watchlistBusy ? 0.6 : 1,
                    }}
                  >
                    {inWatchlist ? <Check size={17} strokeWidth={2.5} /> : <Plus size={17} strokeWidth={2.5} />}
                    {inWatchlist ? 'In List' : 'My List'}
                  </button>

                  {media.imdb_id && (
                    <a href={`https://www.imdb.com/title/${media.imdb_id}`} target="_blank" rel="noopener noreferrer"
                      className="det-btn det-glass" style={{
                        padding: '14px 22px', borderRadius: 11, textDecoration: 'none',
                        background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.16)', color: '#e4e4e7',
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
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                }}>
                  <Users size={14} color="#ffffff" />
                </div>
                <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: isMobile ? 17 : 20, fontWeight: 700, color: '#ffffff', margin: 0 }}>
                  Featured Cast
                </h2>
              </div>
              <div className="hide-scrollbar" style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 10 }}>
                {media.cast.map((actor, i) => (
                  <div key={i} className="det-cast-card" style={{ flexShrink: 0, width: isMobile ? 88 : 110, textAlign: 'center' }}>
                    <div className="det-cast-avatar" style={{
                      width: isMobile ? 74 : 88, height: isMobile ? 74 : 88, borderRadius: '50%',
                      margin: '0 auto 8px', overflow: 'hidden',
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 6px 16px rgba(0,0,0,0.5)',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}>
                      {actor.fullImageUrl || actor.image ? (
                        <img
                          src={actor.fullImageUrl || (actor.image?.startsWith('http') ? actor.image : `https://image.tmdb.org/t/p/w200${actor.image}`)}
                          alt={actor.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{ fontSize: 20 }}>👤</span>
                      )}
                    </div>
                    <p style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12.5, color: '#ffffff', fontWeight: 600,
                      margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{actor.name}</p>
                    <p style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: '#71717a',
                      margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{actor.character}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Footer info ── */}
          {media.homepage && (
            <div style={{ marginTop: 36, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <a href={media.homepage} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                color: '#a1a1aa', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, textDecoration: 'none',
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
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 25px 80px rgba(0,0,0,0.9), 0 0 30px rgba(255,255,255,0.1)',
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
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes detFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes detShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

  .det-skeleton {
    background: linear-gradient(90deg, #09090d 25%, #181822 50%, #09090d 75%);
    background-size: 200% 100%;
    animation: detShimmer 1.4s ease infinite;
  }

  .det-glass {
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }

  .det-tag {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 10px; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase;
    padding: 4px 10px; border-radius: 5px;
  }

  .det-chip {
    display: inline-flex; align-items: center; gap: 5px;
    font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; color: #d4d4d8;
    background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12);
    padding: 5px 12px; border-radius: 20px;
  }

  .det-genre {
    font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12.5px; color: #ffffff;
    background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.14);
    padding: 6px 14px; border-radius: 20px;
  }

  .det-btn {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    border: none; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 14.5px; font-weight: 600; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .det-btn:hover  { transform: translateY(-2px); }
  .det-btn:active { transform: translateY(0) scale(0.97); }
  .det-btn:disabled { cursor: default; }

  @media (hover: hover) and (pointer: fine) {
    .det-cast-card { transition: transform 0.2s ease; }
    .det-cast-card:hover { transform: translateY(-3px); }
    .det-cast-card:hover .det-cast-avatar { border-color: rgba(255, 255, 255, 0.5) !important; box-shadow: 0 0 20px rgba(255, 255, 255, 0.2) !important; }
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
    borderTop: '3px solid #ffffff',
    borderRadius: '50%',
    animation: 'spin 0.9s linear infinite',
  },
  backBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    background: 'rgba(255, 255, 255, 0.06)', color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    padding: '9px 18px', borderRadius: 10, cursor: 'pointer',
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13.5, fontWeight: 500,
    marginBottom: 28, transition: 'all 0.2s',
  },
  trailerOverlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0, 0, 0, 0.9)',
    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    zIndex: 10000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
  },
  trailerCloseBtn: {
    position: 'absolute', top: -46, right: 0,
    background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#fff', width: 38, height: 38, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  },
};
