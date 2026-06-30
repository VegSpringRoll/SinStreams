import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import MediaCard from "../components/MediaCard";
import { Star, Clock, Calendar, ArrowLeft, Play, Monitor } from "lucide-react";

const BACKEND_URL = "http://localhost:5000/api";
const TMDB_API_KEY = '8ade991ea509eefe3cca2142132d753a';

export default function Watch() {
  const location = useLocation();
  const navigate = useNavigate();
  const media = location.state?.media;
  const autoPlay = location.state?.autoPlay || false;

  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(true);
  
  // Video source states
  const [sources, setSources] = useState([]);
  const [currentSource, setCurrentSource] = useState(0);
  const [loadingSources, setLoadingSources] = useState(true);
  const [directUrl, setDirectUrl] = useState(null);
  const [videoType, setVideoType] = useState(null);
  const [useDirect, setUseDirect] = useState(false);
  const [sourceErrors, setSourceErrors] = useState({});
  const [autoSwitching, setAutoSwitching] = useState(false);

  // Season & Episode State
  const [currentSeason, setCurrentSeason] = useState(1);
  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [seasons, setSeasons] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [totalEpisodes, setTotalEpisodes] = useState(0);
  const [showDetails, setShowDetails] = useState(null);

  const isSeries = media?.type === 'series' || media?.type === 'tv';

  useEffect(() => {
    window.scrollTo(0, 0);
    
    if (media) {
      fetchShowDetails();
      fetchStreamSources(media.imdb_id, 1, 1);
      fetchRecommendations();
    }
  }, [media]);

  // Fetch show details for series
  const fetchShowDetails = async () => {
    if (!isSeries) return;
    try {
      const tmdbId = media._id || media.id;
      if (!tmdbId) return;

      const { data } = await axios.get(`https://api.themoviedb.org/3/tv/${tmdbId}`, {
        params: { api_key: TMDB_API_KEY }
      });

      setShowDetails(data);

      const actualSeasons = data.seasons
        ?.filter(s => s.season_number > 0 && s.episode_count > 0)
        .map(s => ({
          season_number: s.season_number,
          episode_count: s.episode_count,
          name: s.name || `Season ${s.season_number}`,
        })) || [];

      setSeasons(actualSeasons);

      if (actualSeasons.length > 0) {
        setCurrentSeason(actualSeasons[0].season_number);
        setTotalEpisodes(actualSeasons[0].episode_count);
        fetchEpisodesForSeason(actualSeasons[0].season_number);
      }
    } catch (err) {
      console.log("Could not fetch show details:", err.message);
    }
  };

  // Fetch episodes for a season
  const fetchEpisodesForSeason = async (seasonNum) => {
    try {
      const tmdbId = media._id || media.id;
      if (!tmdbId) return;

      const { data } = await axios.get(
        `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNum}`,
        { params: { api_key: TMDB_API_KEY } }
      );

      const episodeList = data.episodes
        ?.filter(ep => ep.episode_number > 0)
        .map(ep => ({
          episode_number: ep.episode_number,
          name: ep.name || `Episode ${ep.episode_number}`,
        })) || [];

      setEpisodes(episodeList);
      setTotalEpisodes(episodeList.length);
    } catch (err) {
      console.log("Could not fetch episodes:", err.message);
    }
  };

  // Handle season change
  const handleSeasonChange = (seasonNum) => {
    setCurrentSeason(seasonNum);
    setCurrentEpisode(1);
    fetchEpisodesForSeason(seasonNum);
    fetchStreamSources(media.imdb_id, seasonNum, 1);
  };

  // Handle episode change
  const handleEpisodeChange = (episodeNum) => {
    setCurrentEpisode(episodeNum);
    fetchStreamSources(media.imdb_id, currentSeason, episodeNum);
  };

  // Fetch streaming sources
  const fetchStreamSources = async (imdbId, season = 1, episode = 1) => {
    try {
      setLoadingSources(true);
      setSourceErrors({});
      setUseDirect(false);

      const isSeries = media.type === 'series' || media.type === 'tv';
      const tmdbId = media._id || media.id;
      const anyId = imdbId || tmdbId;
      const type = isSeries ? 'tv' : 'movie';

      // Try direct video
      try {
        const { data } = await axios.get(`${BACKEND_URL}/stream/direct/${type}/${anyId}`, {
          params: { s: season, e: episode }
        });
        if (data.direct && data.url) {
          setDirectUrl(data.url);
          setVideoType(data.type || 'mp4');
          setUseDirect(true);
          setLoadingSources(false);
          return;
        }
      } catch (directErr) {
        console.log("Direct URL failed, using embed sources");
      }

      const sources = [];
      
      sources.push({
        name: '👑 VIP',
        url: isSeries ? `https://vidnest.fun/tv/${tmdbId || anyId}/${season}/${episode}` : `https://vidnest.fun/movie/${tmdbId || anyId}`,
        quality: 'HD/4K', id: 'vidnest'
      });
      sources.push({
        name: '⭐ 2Embed',
        url: isSeries ? `https://www.2embed.cc/embedtv/${tmdbId || anyId}&s=${season}&e=${episode}` : `https://www.2embed.cc/embed/${tmdbId || anyId}`,
        quality: 'HD', id: '2embed'
      });
      sources.push({
        name: '⭐ VidSrc',
        url: isSeries ? `https://vidsrc.to/embed/tv/${imdbId || anyId}/${season}/${episode}` : `https://vidsrc.to/embed/movie/${imdbId || anyId}`,
        quality: 'HD', id: 'vidsrc'
      });
      sources.push({
        name: '⭐ Premium',
        url: isSeries ? `https://embed.smashystream.com/playere.php?imdb=${imdbId || anyId}&s=${season}&e=${episode}` : `https://embed.smashystream.com/playere.php?imdb=${imdbId || anyId}`,
        quality: 'HD', id: 'smashystream'
      });

      if (tmdbId) {
        sources.push({ name: 'VidLink', url: isSeries ? `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}` : `https://vidlink.pro/movie/${tmdbId}`, quality: 'HD', id: 'vidlink' });
        sources.push({ name: 'Embed.su', url: isSeries ? `https://embed.su/embed/tv/${tmdbId}/${season}/${episode}` : `https://embed.su/embed/movie/${tmdbId}`, quality: 'HD', id: 'embedsu' });
        sources.push({ name: 'AutoEmbed', url: `https://autoembed.co/${isSeries ? 'tv' : 'movie'}/${tmdbId}`, quality: 'Auto', id: 'autoembed' });
        sources.push({ name: 'MovieWeb', url: isSeries ? `https://movie-web.app/media/tv/${tmdbId}/${season}/${episode}` : `https://movie-web.app/media/movie/${tmdbId}`, quality: '4K', id: 'movieweb' });
      }

      setSources(sources);
      setCurrentSource(0);
      setLoadingSources(false);
    } catch (err) {
      console.error("Failed to fetch sources:", err);
      setLoadingSources(false);
    }
  };

  // Fetch recommendations
  const fetchRecommendations = async () => {
  try {
    setLoadingRecs(true);
    
    // Use your deployed backend URL
    const BACKEND_URL = import.meta.env.PROD 
      ? "https://sin-streams.vercel.app/"  // Replace with your actual backend URL
      : "http://localhost:5000/api";
    
    const [moviesRes, seriesRes] = await Promise.all([
      axios.get(`${BACKEND_URL}/media/movies`).catch(() => ({ data: [] })),
      axios.get(`${BACKEND_URL}/media/series`).catch(() => ({ data: [] }))
    ]);
    
    // Combine and filter out current media
    let recs = [...(moviesRes.data || []), ...(seriesRes.data || [])]
      .filter(m => m._id !== media._id && m.imdb_id !== media.imdb_id)
      .slice(0, 12);
    
    setRecommendations(recs);
  } catch (err) {
    console.error("Recommendations error:", err);
    setRecommendations([]);
  } finally {
    setLoadingRecs(false);
  }
};

  if (!media) {
    return (
      <div style={styles.errorPage}>
        <h2 style={{ color: '#ccc', fontFamily: "'DM Sans', sans-serif" }}>Session lost or movie not found</h2>
        <button onClick={() => navigate('/')} style={styles.homeBtn}>Go Back Home</button>
      </div>
    );
  }

  const currentEpisodeName = episodes.find(ep => ep.episode_number === currentEpisode)?.name || `Episode ${currentEpisode}`;

  return (
    <div style={styles.container}>
      {/* Back Button */}
      <div style={styles.topNav}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <ArrowLeft size={18} /> Back
        </button>
      </div>

      {/* Video Section */}
      <div style={styles.videoSection}>
        {loadingSources ? (
          <div style={styles.videoPlaceholder}>
            <div style={styles.spinner} />
            <p style={{ color: '#888', fontFamily: "'DM Sans', sans-serif", marginTop: 16 }}>Loading video sources...</p>
          </div>
        ) : (
          <div style={styles.videoWrapper}>
            {useDirect && directUrl ? (
              <video controls autoPlay style={styles.video}>
                <source src={directUrl} type={videoType === 'm3u8' ? 'application/x-mpegURL' : 'video/mp4'} />
              </video>
            ) : (
              <iframe
                src={sources[currentSource]?.url}
                style={styles.video}
                allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                title={media.title}
              />
            )}
          </div>
        )}
      </div>

      {/* CONTROLS BELOW VIDEO */}
      <div style={styles.controlsSection}>
        {/* Episode Selector for Series */}
        {isSeries && (
          <div style={styles.episodeBar}>
            <div style={styles.episodeInfo}>
              <span style={styles.episodeLabel}>Now Playing</span>
              <span style={styles.episodeValue}>Season {currentSeason} • {currentEpisodeName}</span>
            </div>
            <div style={styles.episodeControls}>
              <div style={styles.selectGroup}>
                <label style={styles.selectLabel}>Season</label>
                <select value={currentSeason} onChange={(e) => handleSeasonChange(Number(e.target.value))} style={styles.select}>
                  {seasons.map(s => (
                    <option key={s.season_number} value={s.season_number}>Season {s.season_number} ({s.episode_count} eps)</option>
                  ))}
                </select>
              </div>
              <div style={styles.selectGroup}>
                <label style={styles.selectLabel}>Episode</label>
                <select value={currentEpisode} onChange={(e) => handleEpisodeChange(Number(e.target.value))} style={styles.select}>
                  {episodes.map(ep => (
                    <option key={ep.episode_number} value={ep.episode_number}>E{ep.episode_number} - {ep.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Source Selector */}
        {sources.length > 0 && (
          <div style={styles.sourceBar}>
            <span style={styles.sourceLabel}>
              <Monitor size={16} /> Streaming Server:
            </span>
            <div style={styles.sourceButtons}>
              {sources.map((source, index) => (
                <button
                  key={source.id}
                  style={{
                    ...styles.sourceBtn,
                    ...(index === currentSource ? styles.sourceBtnActive : {}),
                    ...(sourceErrors[index] ? { opacity: 0.4, textDecoration: 'line-through' } : {})
                  }}
                  onClick={() => {
                    setSourceErrors(prev => ({ ...prev, [index]: false }));
                    setCurrentSource(index);
                  }}
                >
                  {sourceErrors[index] ? '❌ ' : ''}{source.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Movie Details */}
      <div style={styles.detailsSection}>
        <div style={styles.detailsContent}>
          {media.images?.poster && (
            <div style={styles.posterContainer}>
              <img src={media.images.poster} alt={media.title} style={styles.poster} />
            </div>
          )}
          <div style={styles.infoContainer}>
            <h1 style={styles.title}>{media.title}</h1>
            <div style={styles.metaRow}>
              {media.year && <span style={styles.metaItem}><Calendar size={15} /> {media.year}</span>}
              {media.rating && (
                <span style={styles.rating}>
                  <Star size={15} fill="#e8b84b" /> {typeof media.rating === 'object' ? (media.rating.percentage / 10).toFixed(1) : media.rating}
                </span>
              )}
              {media.runtime > 0 && <span style={styles.metaItem}><Clock size={15} /> {media.runtime} min</span>}
              {media.seasons && <span style={styles.metaItem}>{media.seasons} Seasons • {media.episodes} Episodes</span>}
            </div>
            {media.genres && (
              <div style={styles.genreRow}>
                {media.genres.map(g => (
                  <span key={g} style={styles.genre}>{g}</span>
                ))}
              </div>
            )}
            <p style={styles.synopsis}>{media.synopsis || "No description available."}</p>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div style={styles.recommendationsSection}>
        <h2 style={styles.sectionTitle}>You May Also Like</h2>
        {loadingRecs ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div style={styles.spinner} />
          </div>
        ) : recommendations.length > 0 ? (
          <div style={styles.recGrid}>
            {recommendations.map((rec, i) => (
              <MediaCard key={rec._id || i} media={rec} type={rec.type || "movie"} index={i} />
            ))}
          </div>
        ) : (
          <p style={{ color: '#666', fontFamily: "'DM Sans', sans-serif" }}>No recommendations available.</p>
        )}
      </div>

      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const styles = {
  container: {
    background: '#080c14',
    minHeight: '100vh',
  },
  errorPage: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#080c14',
    gap: 20,
  },
  homeBtn: {
    padding: '12px 24px',
    background: '#e50914',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 16,
    fontWeight: 600,
  },
  topNav: {
    padding: '16px 32px',
    background: '#000',
    borderBottom: '1px solid #1a2235',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'none',
    border: 'none',
    color: '#8892a4',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
  },
  videoSection: {
    width: '100%',
    background: '#000',
  },
  videoPlaceholder: {
    width: '100%',
    aspectRatio: '16/9',
    maxHeight: '70vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a0a',
  },
  videoWrapper: {
    width: '100%',
    aspectRatio: '16/9',
    maxHeight: '70vh',
  },
  video: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
  controlsSection: {
    background: '#0a0f1a',
    borderBottom: '1px solid #1a2235',
    padding: '16px 32px',
  },
  episodeBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
    padding: '12px 0',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  episodeInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  episodeLabel: {
    color: '#666',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  episodeValue: {
    color: '#e50914',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 15,
    fontWeight: 600,
  },
  episodeControls: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-end',
  },
  selectGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  selectLabel: {
    color: '#666',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  select: {
    background: '#1a2235',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 6,
    padding: '8px 12px',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    outline: 'none',
  },
  sourceBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    padding: '8px 0',
  },
  sourceLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: '#888',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    fontWeight: 500,
    flexShrink: 0,
  },
  sourceButtons: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  sourceBtn: {
    padding: '8px 16px',
    background: '#1a2235',
    color: '#ccc',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  sourceBtnActive: {
    background: '#e50914',
    color: '#fff',
    border: '1px solid #e50914',
  },
  detailsSection: {
    padding: '32px',
    maxWidth: 1200,
    margin: '0 auto',
  },
  detailsContent: {
    display: 'flex',
    gap: 32,
    flexWrap: 'wrap',
  },
  posterContainer: {
    flexShrink: 0,
    width: 200,
    borderRadius: 10,
    overflow: 'hidden',
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
  },
  poster: {
    width: '100%',
    display: 'block',
  },
  infoContainer: {
    flex: 1,
    minWidth: 280,
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 'clamp(24px, 3vw, 40px)',
    fontWeight: 900,
    color: '#fff',
    marginBottom: 12,
  },
  metaRow: {
    display: 'flex',
    gap: 20,
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: '#8892a4',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
  },
  rating: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: '#e8b84b',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    fontWeight: 600,
  },
  genreRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  genre: {
    padding: '4px 12px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 20,
    color: '#a0a8c0',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    textTransform: 'capitalize',
  },
  synopsis: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 15,
    lineHeight: 1.8,
    color: '#8892a4',
    maxWidth: 700,
  },
  recommendationsSection: {
    padding: '32px',
    maxWidth: 1200,
    margin: '0 auto',
  },
  sectionTitle: {
    fontFamily: "'DM Sans', sans-serif",
    color: '#e8eaf0',
    fontSize: 20,
    fontWeight: 600,
    marginBottom: 20,
  },
  recGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 16,
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid rgba(255,255,255,0.1)',
    borderTop: '3px solid #e50914',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};