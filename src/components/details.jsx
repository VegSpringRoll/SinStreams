import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Play, Plus, Check, Star, Clock, Calendar, Film, Tv,
  X, Youtube, Globe, Users, DollarSign, ExternalLink
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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    fetchDetails();
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

  if (loading) {
    return (
      <div className="page-content" style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p style={{ color: '#888', fontFamily: "'DM Sans', sans-serif" }}>Loading details...</p>
        </div>
      </div>
    );
  }

  if (error || !media) {
    return (
      <div className="page-content" style={styles.container}>
        <div style={styles.loadingContainer}>
          <p style={{ color: '#ccc', fontSize: 18 }}>{error || 'Not found'}</p>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>Go Back</button>
        </div>
      </div>
    );
  }

  const runtimeLabel = formatRuntime(media.runtime);

  return (
    <>
      <style>{RESPONSIVE_CSS}</style>

      <div className="page-content details-container" style={styles.container}>
        {/* Backdrop */}
        <div className="details-backdrop" style={{
          ...styles.backdrop,
          backgroundImage: media.images?.fanart ? `url(${media.images.fanart})` : 'none',
        }}>
          <div style={styles.backdropOverlay} />
        </div>

        {/* Content */}
        <div className="details-content" style={styles.content}>
          <button onClick={() => navigate(-1)} style={styles.backBtn} className="details-back-btn">← Back</button>

          <div className="details-main" style={styles.mainInfo}>
            {/* Poster */}
            <div className="details-poster" style={styles.posterContainer}>
              {media.images?.poster ? (
                <>
                  {!posterLoaded && <div className="details-poster-skeleton" style={styles.posterPlaceholder} />}
                  <img
                    src={media.images.poster}
                    alt={media.title}
                    style={{ ...styles.poster, display: posterLoaded ? 'block' : 'none' }}
                    onLoad={() => setPosterLoaded(true)}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </>
              ) : (
                <div style={styles.posterPlaceholder}>
                  {media.type === 'series' ? <Tv size={40} /> : <Film size={40} />}
                </div>
              )}
            </div>

            {/* Info */}
            <div style={styles.info}>
              <h1 className="details-title" style={styles.title}>{media.title}</h1>

              {media.tagline && (
                <p className="details-tagline" style={styles.tagline}>"{media.tagline}"</p>
              )}

              <div className="details-meta-row" style={styles.metaRow}>
                {media.rating && media.rating.percentage > 0 && (
                  <span style={styles.rating}>
                    <Star size={16} fill="#e8b84b" color="#e8b84b" />
                    {(media.rating.percentage / 10).toFixed(1)}
                  </span>
                )}
                {media.year && <span style={styles.metaItem}><Calendar size={14} /> {media.year}</span>}
                {runtimeLabel && <span style={styles.metaItem}><Clock size={14} /> {runtimeLabel}</span>}
                {media.seasons && (
                  <span style={styles.metaItem}>{media.seasons} Season{media.seasons > 1 ? 's' : ''} • {media.episodes} Episodes</span>
                )}
                {media.status && <span style={styles.statusBadge}>{media.status}</span>}
              </div>

              <div className="details-genre-row" style={styles.genreRow}>
                {media.genres?.map(g => (
                  <span key={g} style={styles.genre}>{g}</span>
                ))}
              </div>

              {media.synopsis && (
                <p className="details-synopsis" style={styles.synopsis}>{media.synopsis}</p>
              )}

              <div className="details-credits" style={styles.creditsGrid}>
                {media.director && (
                  <p style={styles.credit}><strong>Director</strong><span>{media.director}</span></p>
                )}
                {media.created_by && (
                  <p style={styles.credit}><strong>Created by</strong><span>{media.created_by}</span></p>
                )}
                {media.writers?.length > 0 && (
                  <p style={styles.credit}><strong>Writers</strong><span>{media.writers.join(', ')}</span></p>
                )}
                {media.networks?.length > 0 && (
                  <p style={styles.credit}><strong>Network</strong><span>{media.networks.join(', ')}</span></p>
                )}
                {media.originalLanguage && (
                  <p style={styles.credit}><strong>Language</strong><span>{media.originalLanguage}</span></p>
                )}
                {media.productionCompanies?.length > 0 && (
                  <p style={styles.credit}><strong>Studio</strong><span>{media.productionCompanies.join(', ')}</span></p>
                )}
                {formatCurrency(media.budget) && (
                  <p style={styles.credit}><strong>Budget</strong><span>{formatCurrency(media.budget)}</span></p>
                )}
                {formatCurrency(media.revenue) && (
                  <p style={styles.credit}><strong>Revenue</strong><span>{formatCurrency(media.revenue)}</span></p>
                )}
              </div>

              <div className="details-action-row" style={styles.actionRow}>
                <button onClick={handlePlay} style={styles.playBtn} className="details-play-btn">
                  <Play size={20} fill="white" /> Play Now
                </button>

                {media.trailerKey && (
                  <button onClick={() => setShowTrailer(true)} style={styles.trailerBtn} className="details-trailer-btn">
                    <Youtube size={19} /> Trailer
                  </button>
                )}

                <button
                  onClick={handleWatchlist}
                  disabled={watchlistBusy}
                  style={{
                    ...styles.watchlistBtn,
                    ...(inWatchlist ? styles.watchlistActive : {}),
                    ...(watchlistBusy ? { opacity: 0.6, cursor: 'default' } : {})
                  }}
                  className="details-watchlist-btn"
                >
                  {inWatchlist ? <Check size={18} /> : <Plus size={18} />}
                  {inWatchlist ? 'In List' : 'My List'}
                </button>

                {media.imdb_id && (
                  <a
                    href={`https://www.imdb.com/title/${media.imdb_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.imdbBtn}
                    className="details-imdb-btn"
                  >
                    <ExternalLink size={16} /> IMDb
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Cast */}
          {media.cast && media.cast.length > 0 && (
            <div style={styles.castSection}>
              <h2 style={styles.sectionTitle}><Users size={18} /> Cast</h2>
              <div className="details-cast-row" style={styles.castRow}>
                {media.cast.map((actor, i) => (
                  <div key={i} className="details-cast-card" style={styles.castCard}>
                    <div className="details-cast-image" style={{
                      ...styles.castImage,
                      backgroundImage: actor.image ? `url(https://image.tmdb.org/t/p/w200${actor.image})` : 'none',
                    }}>
                      {!actor.image && <span style={{ fontSize: 20 }}>👤</span>}
                    </div>
                    <p style={styles.castName}>{actor.name}</p>
                    <p style={styles.castRole}>{actor.character}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extra info footer */}
          {(media.homepage || media.spokenLanguages?.length > 0) && (
            <div style={styles.footerInfo}>
              {media.homepage && (
                <a href={media.homepage} target="_blank" rel="noopener noreferrer" style={styles.footerLink}>
                  <Globe size={14} /> Official Site
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Trailer Modal */}
      {showTrailer && media.trailerKey && (
        <div
          className="details-trailer-overlay"
          style={styles.trailerOverlay}
          onClick={() => setShowTrailer(false)}
        >
          <div
            className="details-trailer-modal"
            style={styles.trailerModal}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowTrailer(false)}
              style={styles.trailerCloseBtn}
              aria-label="Close trailer"
            >
              <X size={22} />
            </button>
            <div style={styles.trailerAspectBox}>
              <iframe
                src={`https://www.youtube.com/embed/${media.trailerKey}?autoplay=1&rel=0&modestbranding=1`}
                title={media.trailerName || `${media.title} Trailer`}
                style={styles.trailerIframe}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Responsive CSS (mobile-first overrides via media queries) ───
const RESPONSIVE_CSS = `
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes detailsFadeIn { from { opacity: 0; } to { opacity: 1; } }

.details-poster-skeleton {
  animation: detailsPulse 1.4s ease-in-out infinite;
}
@keyframes detailsPulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.7; }
}

.details-trailer-overlay { animation: detailsFadeIn 0.15s ease-out; }

@media (max-width: 768px) {
  .details-content { padding: 80px 16px 32px !important; }
  .details-backdrop { height: 320px !important; }
  .details-main { flex-direction: column; align-items: center; gap: 20px !important; }
  .details-poster { width: 170px !important; }
  .details-poster img, .details-poster-skeleton { width: 170px !important; height: 255px !important; }
  .details-title { text-align: center; font-size: clamp(24px, 7vw, 32px) !important; }
  .details-tagline { text-align: center; }
  .details-meta-row { justify-content: center; }
  .details-genre-row { justify-content: center; }
  .details-synopsis { text-align: center; font-size: 14px !important; }
  .details-credits { justify-content: center; text-align: center; }
  .details-action-row { flex-direction: column; width: 100%; }
  .details-action-row > button, .details-action-row > a { width: 100%; justify-content: center; }
  .details-cast-row { gap: 12px !important; }
  .details-cast-card { width: 90px !important; }
  .details-back-btn { margin-bottom: 20px !important; }
  .details-trailer-modal { width: 94vw !important; }
}

@media (max-width: 420px) {
  .details-content { padding: 72px 12px 28px !important; }
  .details-poster { width: 145px !important; }
  .details-poster img, .details-poster-skeleton { width: 145px !important; height: 217px !important; }
}
`;

const styles = {
  container: {
    minHeight: '100vh',
    background: '#080c14',
    position: 'relative',
  },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '500px',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  },
  backdropOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to bottom, rgba(8,12,20,0.6) 0%, rgba(8,12,20,0.95) 100%)',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    padding: '100px 40px 40px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    gap: '16px',
  },
  spinner: {
    width: '50px', height: '50px',
    border: '3px solid rgba(255,255,255,0.1)',
    borderTop: '3px solid #e50914',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  backBtn: {
    background: 'rgba(255,255,255,0.1)',
    color: '#ccc',
    border: '1px solid rgba(255,255,255,0.2)',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '14px',
    marginBottom: '30px',
  },
  mainInfo: {
    display: 'flex',
    gap: '40px',
    flexWrap: 'wrap',
  },
  posterContainer: {
    flexShrink: 0,
    position: 'relative',
  },
  poster: {
    width: '300px',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
  },
  posterPlaceholder: {
    width: '300px',
    height: '450px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#444',
  },
  info: {
    flex: 1,
    minWidth: '300px',
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 'clamp(28px, 4vw, 48px)',
    fontWeight: '900',
    color: '#fff',
    margin: '0 0 10px',
  },
  tagline: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '16px',
    color: '#888',
    fontStyle: 'italic',
    margin: '0 0 15px',
  },
  metaRow: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: '15px',
  },
  rating: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#e8b84b',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '16px',
    fontWeight: '600',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#888',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '14px',
  },
  statusBadge: {
    padding: '3px 10px',
    borderRadius: '20px',
    background: 'rgba(90,180,120,0.15)',
    border: '1px solid rgba(90,180,120,0.35)',
    color: '#7fd19c',
    fontSize: '12px',
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: '600',
  },
  genreRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '20px',
  },
  genre: {
    padding: '6px 14px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '20px',
    color: '#aaa',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '13px',
  },
  synopsis: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '15px',
    color: '#999',
    lineHeight: '1.8',
    marginBottom: '18px',
  },
  creditsGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px 28px',
    marginBottom: '10px',
  },
  credit: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '13px',
    color: '#888',
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  actionRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '25px',
    flexWrap: 'wrap',
  },
  playBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '14px 32px',
    background: '#e50914',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    fontFamily: "'DM Sans', sans-serif",
  },
  trailerBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '14px 24px',
    background: 'rgba(255,255,255,0.08)',
    color: '#eee',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
    fontFamily: "'DM Sans', sans-serif",
  },
  watchlistBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '14px 24px',
    background: 'rgba(255,255,255,0.1)',
    color: '#ccc',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    fontFamily: "'DM Sans', sans-serif",
  },
  watchlistActive: {
    background: 'rgba(232,184,75,0.15)',
    border: '1px solid rgba(232,184,75,0.4)',
    color: '#e8b84b',
  },
  imdbBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '14px 20px',
    background: 'rgba(245,197,24,0.1)',
    color: '#f5c518',
    border: '1px solid rgba(245,197,24,0.3)',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: "'DM Sans', sans-serif",
    textDecoration: 'none',
  },
  castSection: {
    marginTop: '50px',
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '22px',
    fontWeight: '600',
    color: '#ccc',
    marginBottom: '20px',
  },
  castRow: {
    display: 'flex',
    gap: '16px',
    overflowX: 'auto',
    paddingBottom: '10px',
  },
  castCard: {
    flexShrink: 0,
    width: '120px',
    textAlign: 'center',
  },
  castImage: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.05)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    margin: '0 auto 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  castName: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '13px',
    color: '#ccc',
    fontWeight: '500',
    margin: '0 0 2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  castRole: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '11px',
    color: '#666',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  footerInfo: {
    marginTop: '40px',
    paddingTop: '20px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    gap: '20px',
  },
  footerLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#888',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '13px',
    textDecoration: 'none',
  },
  // Trailer modal
  trailerOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.85)',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  trailerModal: {
    position: 'relative',
    width: '900px',
    maxWidth: '100%',
  },
  trailerCloseBtn: {
    position: 'absolute',
    top: '-44px',
    right: 0,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  trailerAspectBox: {
    position: 'relative',
    width: '100%',
    paddingTop: '56.25%', // 16:9
    background: '#000',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
  },
  trailerIframe: {
    position: 'absolute',
    top: 0, left: 0,
    width: '100%',
    height: '100%',
    border: 'none',
  },
};