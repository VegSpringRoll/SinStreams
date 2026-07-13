import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Maximize, Minimize } from 'lucide-react';

const BACKEND_URL = import.meta.env.PROD ? "/api" : "http://localhost:5000/api";
const TMDB_API_KEY = '8ade991ea509eefe3cca2142132d753a';

export default function VideoPlayer({ media, onClose }) {
  const [currentSource, setCurrentSource] = useState(0);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const iframeRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);



  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    };
  }, []);

  // Direct video state
  const [directUrl, setDirectUrl] = useState(null);
  const [videoType, setVideoType] = useState(null);
  const [useDirect, setUseDirect] = useState(false);

  // Season & Episode State
  const [currentSeason, setCurrentSeason] = useState(1);
  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [seasons, setSeasons] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [totalEpisodes, setTotalEpisodes] = useState(0);
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    if (media.type === 'series' || media.type === 'tv') {
      fetchShowDetails();
    } else {
      fetchStreamSources(media.imdb_id, 1, 1);
    }
  }, [media]);

  // Fetch show details from TMDB
  const fetchShowDetails = async () => {
    try {
      const tmdbId = media._id || media.id;
      if (!tmdbId) {
        setError("Cannot load show details");
        setLoading(false);
        return;
      }

      const { data } = await axios.get(`https://api.themoviedb.org/3/tv/${tmdbId}`, {
        params: { api_key: TMDB_API_KEY }
      });

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
        fetchStreamSources(media.imdb_id, actualSeasons[0].season_number, 1);
      }
    } catch (err) {
      console.log("Could not fetch show details:", err.message);
      setError("Failed to load show information");
      setLoading(false);
    }
  };

  // Fetch episodes for a specific season
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

  // Handle prev/next episode
  const handlePrevEpisode = () => {
    if (currentEpisode > 1) handleEpisodeChange(currentEpisode - 1);
  };

  const handleNextEpisode = () => {
    if (currentEpisode < totalEpisodes) handleEpisodeChange(currentEpisode + 1);
  };

  // Fetch streaming sources
  const fetchStreamSources = async (imdbId, season = 1, episode = 1) => {
    try {
      setLoading(true);
      setError(null);
      setUseDirect(false);

      const isSeries = media.type === 'series' || media.type === 'tv';
      const tmdbId = media._id || media.id;
      const id = imdbId || tmdbId;
      const type = isSeries ? 'tv' : 'movie';

      // Try direct video first
      try {
        const { data } = await axios.get(`${BACKEND_URL}/stream/direct/${type}/${id}`, {
          params: { s: season, e: episode }
        });
        
        if (data.direct && data.url) {
          setDirectUrl(data.url);
          setVideoType(data.type || 'mp4');
          setUseDirect(true);
          setLoading(false);
          return;
        }
      } catch (directErr) {
        console.log("Direct URL failed, using embed sources");
      }

      const sources = [];
      const anyId = tmdbId || imdbId; // Fallback ID for sources that can use either

      // #1 - VIDLUX
      if (tmdbId) {
        sources.push({
          name: 'God👑',
          url: isSeries
            ? `https://vsembed.ru/embed/tv/${tmdbId || anyId}/${season}/${episode}?autoPlay=true`
            : `https://vsembed.ru/embed/movie/${tmdbId || anyId}?autoPlay=true`,
          quality: 'HD', id: 'vidlux'
        });
      }

      // #2 - VIDSRC.WTF 
      sources.push({
        name: 'DemiGod👑',
        url: isSeries
          ? `https://vidcore.net/tv/${tmdbId || anyId}/${season}/${episode}?color=e8b84b`
          : `https://vidcore.net/movie/${tmdbId || anyId}?color=e8b84b`,
        quality: 'HD', id: 'vidsrcwtf'
      });

      // #3 - VIDSRC (Needs imdbId, fallback to anyId)
      sources.push({
        name: 'Fastest⚡',
        url: isSeries 
          ? `https://vidsrc.to/embed/tv/${imdbId || anyId}/${season}/${episode}` 
          : `https://vidsrc.to/embed/movie/${imdbId || anyId}`,
        quality: 'HD',
        id: 'vidsrc'
      });
      
      // #4 - 2EMBED - Use tmdbId, fallback to anyId
      sources.push({
        name: '2embed',
        url: isSeries 
          ? `https://www.2embed.cc/embedtv/${tmdbId || anyId}&s=${season}&e=${episode}` 
          : `https://www.2embed.cc/embed/${tmdbId || anyId}`,
        quality: 'HD',
        id: '2embed'
      });
      
      // #5 - VIDNEST (Needs tmdbId, fallback to anyId)
      sources.push({
        name: 'Elite👑',
        url: isSeries 
          ? `https://vidnest.fun/tv/${tmdbId || anyId}/${season}/${episode}` 
          : `https://vidnest.fun/movie/${tmdbId || anyId}`,
        quality: 'HD/4K',
        id: 'vidnest'
      });

      // #6 - SMASHYSTREAM - Use imdbId, fallback to anyId
      sources.push({
        name: 'Premium HD 🔥',
        url: isSeries 
          ? `https://embed.smashystream.com/playere.php?imdb=${imdbId || anyId}&s=${season}&e=${episode}` 
          : `https://embed.smashystream.com/playere.php?imdb=${imdbId || anyId}`,
        quality: 'HD',
        id: 'smashystream'
      });
        
      // Bonus source (kept as-is, not part of the numbered list)
      if (tmdbId) {
        sources.push({
          name: 'VidLink',
          url: isSeries ? `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}` : `https://vidlink.pro/movie/${tmdbId}`,
          quality: 'HD',
          id: 'vidlink'
        });
      }

      if (sources.length > 0) {
        setSources(sources);
        setCurrentSource(0);
      } else {
        setError("No streaming sources available");
      }
      setLoading(false);
      
    } catch (err) {
      console.error("Failed to fetch sources:", err);
      setError("Failed to load video sources");
      setLoading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrevEpisode();
      if (e.key === 'ArrowRight') handleNextEpisode();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentEpisode, totalEpisodes]);

  const isSeries = media.type === 'series' || media.type === 'tv';
  const currentEpisodeName = episodes.find(ep => ep.episode_number === currentEpisode)?.name || `Episode ${currentEpisode}`;

  // Loading State
  if (loading) {
    return (
      <div className="video-player-overlay" style={styles.overlay} onClick={handleOverlayClick}>
        <div className="video-player-container" style={styles.player}>
          <div style={styles.centerContent}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>Loading player...</p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="video-player-overlay" style={styles.overlay} onClick={handleOverlayClick}>
        <div className="video-player-container" style={styles.player}>
          <div style={styles.centerContent}>
            <div style={{ fontSize: 48 }}>😕</div>
            <p style={{ color: '#ccc', fontSize: 18, fontFamily: "'DM Sans', sans-serif" }}>{error}</p>
            <button style={styles.retryBtn} onClick={onClose}>Close</button>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div style={styles.player}>
        {/* Close Button */}
        <button style={styles.closeBtn} onClick={onClose}>✕</button>

        {/* Top Bar */}
        <div style={styles.topBar}>
          <div style={styles.mediaInfo}>
            <h3 style={styles.mediaTitle}>{media.title}</h3>
            {media.year && <span style={styles.mediaYear}>{media.year}</span>}
          </div>
          {isSeries && (
            <button style={styles.episodeToggleBtn} onClick={() => setShowSelector(!showSelector)}>
              📺 S{currentSeason}:E{currentEpisode} ▾
            </button>
          )}
        </div>

        {/* Episode Selector Panel */}
        {isSeries && showSelector && (
          <div style={styles.episodePanel}>
            <div style={styles.currentEpisodeInfo}>
              <span style={styles.currentEpisodeLabel}>Now Playing:</span>
              <span style={styles.currentEpisodeTitle}>Season {currentSeason} • {currentEpisodeName}</span>
            </div>
            <div style={styles.selectorRow}>
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
              <div style={styles.quickNav}>
                <button style={{...styles.navBtn, ...(currentEpisode <= 1 ? styles.navBtnDisabled : {})}} onClick={handlePrevEpisode} disabled={currentEpisode <= 1}>◀ Prev</button>
                <span style={styles.episodeCounter}>{currentEpisode}/{totalEpisodes}</span>
                <button style={{...styles.navBtn, ...(currentEpisode >= totalEpisodes ? styles.navBtnDisabled : {})}} onClick={handleNextEpisode} disabled={currentEpisode >= totalEpisodes}>Next ▶</button>
              </div>
            </div>
          </div>
        )}

        {/* Source Selector */}
        {sources.length > 1 && (
          <div style={styles.sourceSelector}>
            {sources.map((source, index) => (
              <button
                key={source.id}
                style={{...styles.sourceBtn, ...(index === currentSource ? styles.activeSource : {})}}
                onClick={() => setCurrentSource(index)}
              >
                {source.name}
              </button>
            ))}
          </div>
        )}

        {/* Video Player */}
        <div style={styles.videoWrapper}>
          {useDirect && directUrl ? (
            <video controls autoPlay style={styles.video} key={directUrl}>
              <source src={directUrl} type={videoType === 'm3u8' ? 'application/x-mpegURL' : 'video/mp4'} />
            </video>
          ) : (
            <>
              <iframe
                ref={iframeRef}
                src={sources[currentSource]?.url}
                style={styles.video}
                allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                title={media.title}
              />
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0, 0, 0, 0.95)', zIndex: 1000,
    display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px',
  },
  player: {
    position: 'relative', width: '100%', maxWidth: '1200px', aspectRatio: '16/9',
    background: '#000', borderRadius: '12px', overflow: 'hidden',
    boxShadow: '0 25px 80px rgba(0,0,0,0.8)',
  },
  videoWrapper: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1,
  },
  video: {
    width: '100%', height: '100%', border: 'none',
  },
  fullscreenBtn: {
    position: 'absolute', bottom: 16, right: 16, zIndex: 5,
    width: 36, height: 36, borderRadius: 8,
    background: 'rgba(10,10,10,0.7)', border: '1px solid rgba(255,255,255,0.15)',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
  },
  closeBtn: {
    position: 'absolute', top: '15px', right: '15px', zIndex: 20,
    background: 'rgba(0,0,0,0.8)', color: 'white',
    border: '2px solid rgba(255,255,255,0.2)', borderRadius: '50%',
    width: '40px', height: '40px', cursor: 'pointer', fontSize: '20px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  topBar: {
    position: 'absolute', top: '15px', left: '15px', right: '70px', zIndex: 10,
    display: 'flex', alignItems: 'center', gap: '12px',
  },
  mediaInfo: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: 'rgba(0,0,0,0.8)', padding: '8px 16px', borderRadius: '8px',
    flex: 1, minWidth: 0,
  },
  mediaTitle: {
    color: '#fff', fontFamily: "'DM Sans', sans-serif", fontSize: '16px',
    fontWeight: '600', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  mediaYear: {
    color: '#888', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', fontWeight: '400', flexShrink: 0,
  },
  episodeToggleBtn: {
    background: 'rgba(0,0,0,0.8)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '8px', padding: '8px 16px', cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif", fontSize: '14px', fontWeight: '600', whiteSpace: 'nowrap',
  },
  episodePanel: {
    position: 'absolute', top: '70px', left: '15px', right: '15px', zIndex: 15,
    background: 'rgba(10, 10, 20, 0.98)', borderRadius: '12px', padding: '20px',
    border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)',
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
  },
  currentEpisodeInfo: {
    marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)',
    display: 'flex', alignItems: 'center', gap: '8px',
  },
  currentEpisodeLabel: {
    color: '#666', fontFamily: "'DM Sans', sans-serif", fontSize: '12px', fontWeight: '600', textTransform: 'uppercase',
  },
  currentEpisodeTitle: {
    color: '#e50914', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', fontWeight: '600',
  },
  selectorRow: {
    display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap',
  },
  selectGroup: {
    display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '150px',
  },
  selectLabel: {
    color: '#aaa', fontFamily: "'DM Sans', sans-serif", fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px',
  },
  select: {
    background: '#1a1a2e', color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px', padding: '10px 14px', fontFamily: "'DM Sans', sans-serif",
    fontSize: '14px', fontWeight: '500', cursor: 'pointer', outline: 'none', width: '100%',
    WebkitAppearance: 'menulist',
  },
  quickNav: {
    display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto',
  },
  navBtn: {
    background: '#1a1a2e', color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px', padding: '10px 16px', cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: '500', transition: 'all 0.2s',
  },
  navBtnDisabled: { opacity: 0.3, cursor: 'not-allowed' },
  episodeCounter: {
    color: '#888', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', fontWeight: '600', padding: '0 8px',
  },
  sourceSelector: {
    position: 'absolute', top: '60px', left: '15px', zIndex: 10,
    display: 'flex', gap: '6px', flexWrap: 'wrap', maxWidth: 'calc(100% - 100px)',
  },
  sourceBtn: {
    padding: '4px 10px', background: 'rgba(0,0,0,0.7)', color: '#fff',
    border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', cursor: 'pointer',
    fontSize: '10px', fontFamily: "'DM Sans', sans-serif", fontWeight: '600', whiteSpace: 'nowrap',
    opacity: 0.8,
  },
  activeSource: { background: '#e50914', border: '1px solid #e50914', opacity: 1 },
  centerContent: {
    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
    height: '100%', color: '#fff', fontFamily: "'DM Sans', sans-serif", gap: '12px',
  },
  spinner: {
    width: '50px', height: '50px', border: '3px solid rgba(255,255,255,0.1)',
    borderTop: '3px solid #e50914', borderRadius: '50%', animation: 'spin 1s linear infinite',
  },
  loadingText: { fontSize: '18px', fontWeight: '600', margin: 0 },
  retryBtn: {
    padding: '12px 24px', background: '#e50914', color: 'white', border: 'none',
    borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: '600',
    fontFamily: "'DM Sans', sans-serif",
  },
};