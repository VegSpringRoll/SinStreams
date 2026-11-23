import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { Maximize, Minimize, Tv, Film, Sparkles, Search, X } from 'lucide-react';
import { saveLastWatched } from '../../services/Watchhistory';
import { resolveEpisodeCount } from '../../services/animeService';

const BACKEND_URL = import.meta.env.PROD ? "/api" : "http://localhost:5000/api";
const TMDB_API_KEY = '8ade991ea509eefe3cca2142132d753a';

const ANIME_SERVERS = [
  {
    id: 'ichigo',
    name: 'Ichigo',
    subUrl: (ani, mal, ep) => ani ? `https://megaplay.buzz/stream/ani/${ani}/${ep}/sub` : `https://megaplay.buzz/stream/mal/${mal}/${ep}/sub`,
    dubUrl: (ani, mal, ep) => ani ? `https://megaplay.buzz/stream/ani/${ani}/${ep}/dub` : `https://megaplay.buzz/stream/mal/${mal}/${ep}/dub`,
  },
  {
    id: 'yukisuo',
    name: 'Yuki Suo',
    subUrl: (ani, mal, ep) => `https://anixo.buzz/embed/ani/${ani || mal}/${ep}?lang=sub`,
    dubUrl: (ani, mal, ep) => `https://anixo.buzz/embed/ani/${ani || mal}/${ep}?lang=dub`,
  },
  {
    id: 'hinata',
    name: 'Hinata',
    subUrl: (ani, mal, ep) => `https://vidy.st/anime/${ani || mal}/${ep}?color=ffffff`,
    dubUrl: (ani, mal, ep) => `https://vidy.st/anime/${ani || mal}/${ep}?color=ffffff&dub=1`,
  },
  {
    id: 'makima',
    name: 'Makima',
    subUrl: (ani, mal, ep) => `https://anyembed.se/e/${ani || mal}/${ep}?lang=sub&autoplay=1`,
    dubUrl: (ani, mal, ep) => `https://anyembed.se/e/${ani || mal}/${ep}?lang=dub&autoplay=1`,
  },
];

const CHUNK_SIZE = 100;

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
  const [animeLang, setAnimeLang] = useState('sub');
  const [selectedAnimeServer, setSelectedAnimeServer] = useState('ichigo');
  const [activeChunkIndex, setActiveChunkIndex] = useState(0);
  const [episodeSearch, setEpisodeSearch] = useState('');

  const isAnime = media?.type === 'anime';
  const isSeries = !isAnime && (media?.type === 'series' || media?.type === 'tv');

  const animeChunks = useMemo(() => {
    if (!totalEpisodes) return [];
    const count = Math.ceil(totalEpisodes / CHUNK_SIZE) || 1;
    return Array.from({ length: count }, (_, idx) => {
      const start = idx * CHUNK_SIZE + 1;
      const end = Math.min((idx + 1) * CHUNK_SIZE, totalEpisodes);
      return { index: idx, label: `${start} - ${end}`, start, end };
    });
  }, [totalEpisodes]);

  const visibleAnimeEpisodes = useMemo(() => {
    if (!episodes || episodes.length === 0) return [];
    if (episodeSearch.trim()) {
      const q = episodeSearch.trim().toLowerCase();
      return episodes.filter(ep => String(ep.episode_number).includes(q) || ep.name?.toLowerCase().includes(q));
    }
    const chunk = animeChunks[activeChunkIndex] || animeChunks[0];
    if (!chunk) return episodes;
    return episodes.filter(ep => ep.episode_number >= chunk.start && ep.episode_number <= chunk.end);
  }, [episodes, animeChunks, activeChunkIndex, episodeSearch]);

  useEffect(() => {
    if (isAnime) {
      const count = resolveEpisodeCount(media);
      const epList = Array.from({ length: count }, (_, i) => ({
        episode_number: i + 1,
        name: `Episode ${i + 1}`,
      }));
      setEpisodes(epList);
      setTotalEpisodes(count);
      fetchStreamSources(null, 1, 1);
    } else if (isSeries) {
      fetchShowDetails();
    } else {
      fetchStreamSources(media.imdb_id, 1, 1);
    }
  }, [media]);

  useEffect(() => {
    if (!media) return;
    if (isAnime) {
      saveLastWatched(media, { episode: currentEpisode, episodeName: `Episode ${currentEpisode}` });
    } else if (isSeries) {
      if (!currentSeason || !currentEpisode) return;
      const epName = episodes.find(e => e.episode_number === currentEpisode)?.name || null;
      saveLastWatched(media, { season: currentSeason, episode: currentEpisode, episodeName: epName });
    } else {
      saveLastWatched(media, {});
    }
  }, [media, isAnime, isSeries, currentSeason, currentEpisode, episodes]);

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
      setError("Failed to load broadcast information");
      setLoading(false);
    }
  };

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

  const handleSeasonChange = (newSeason) => {
    setCurrentSeason(newSeason);
    setCurrentEpisode(1);
    fetchEpisodesForSeason(newSeason);
    fetchStreamSources(media.imdb_id, newSeason, 1);
  };

  const handleEpisodeChange = (newEpisode) => {
    setCurrentEpisode(newEpisode);
    if (isAnime) {
      const chunkIdx = Math.floor((newEpisode - 1) / CHUNK_SIZE);
      setActiveChunkIndex(chunkIdx);
      const anilistId = media?.anilist_id || media?._id || media?.id;
      const malId = media?.mal_id;
      const srv = ANIME_SERVERS.find(s => s.id === selectedAnimeServer) || ANIME_SERVERS[0];
      const targetUrl = animeLang === 'dub'
        ? srv.dubUrl(anilistId, malId, newEpisode)
        : srv.subUrl(anilistId, malId, newEpisode);
      setSources([{ name: `${srv.name} (${animeLang.toUpperCase()})`, url: targetUrl, id: srv.id }]);
      setCurrentSource(0);
    } else {
      fetchStreamSources(media.imdb_id, currentSeason, newEpisode);
    }
  };

  const handleSelectAnimeServer = (serverId, lang) => {
    setSelectedAnimeServer(serverId);
    setAnimeLang(lang);
    const anilistId = media?.anilist_id || media?._id || media?.id;
    const malId = media?.mal_id;
    const srv = ANIME_SERVERS.find(s => s.id === serverId) || ANIME_SERVERS[0];
    const targetUrl = lang === 'dub'
      ? srv.dubUrl(anilistId, malId, currentEpisode)
      : srv.subUrl(anilistId, malId, currentEpisode);

    setSources([{ name: `${srv.name} (${lang.toUpperCase()})`, url: targetUrl, id: srv.id }]);
    setCurrentSource(0);
  };

  const fetchStreamSources = async (imdbId, season = 1, episode = 1) => {
    try {
      setLoading(true);
      setError(null);
      setUseDirect(false);
      setDirectUrl(null);

      if (isAnime) {
        const anilistId = media?.anilist_id || media?._id || media?.id;
        const malId = media?.mal_id;
        const ep = episode || currentEpisode || 1;
        const srv = ANIME_SERVERS.find(s => s.id === selectedAnimeServer) || ANIME_SERVERS[0];
        const targetUrl = animeLang === 'dub'
          ? srv.dubUrl(anilistId, malId, ep)
          : srv.subUrl(anilistId, malId, ep);

        setSources([{ name: `${srv.name} (${animeLang.toUpperCase()})`, url: targetUrl, id: srv.id }]);
        setCurrentSource(0);
        setLoading(false);
        return;
      }

      const type = media.type === 'series' || media.type === 'tv' ? 'tv' : 'movie';
      const tmdbId = media._id || media.id;
      const isSeries = type === 'tv';

      try {
        const { data } = await axios.get(`${BACKEND_URL}/stream/direct/${type}/${tmdbId || imdbId}`, {
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

      if (tmdbId) {
        sources.push({
          name: 'Server Alpha',
          url: isSeries 
            ? `https://vidspark.to/tv/${tmdbId}/${season}/${episode}?autoPlay=true`
            : `https://vidspark.to/movie/${tmdbId}?autoPlay=true`,
          quality: 'HD',
          id: 'vidlux'
        });
      }

      sources.push({
        name: 'Server Beta',
        url: isSeries 
          ? `https://vidcore.net/tv/${tmdbId}/${season}/${episode}?color=ffffff`
          : `https://vidcore.net/movie/${tmdbId}?color=ffffff`,
        quality: 'HD',
        id: 'vidsrcwtf'
      });

      sources.push({
        name: 'Server Gamma (Fast)',
        url: isSeries ? `https://vidsrc.to/embed/tv/${imdbId}/${season}/${episode}` : `https://vidsrc.to/embed/movie/${imdbId}`,
        quality: 'HD',
        id: 'vidsrc'
      });
      sources.push({
        name: 'Server Delta',
        url: isSeries ? `https://www.2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}` : `https://www.2embed.cc/embed/${tmdbId}`,
        quality: 'HD',
        id: '2embed'
      });
      sources.push({
        name: 'Server Epsilon (4K)',
        url: isSeries ? `https://player.videasy.net/tv/${tmdbId}/${season}/${episode}` 
          : `https://player.videasy.net/movie/${tmdbId}`,
        quality: 'HD/4K',
        id: 'vidnest'
      });
      sources.push({
        name: 'Server Zeta',
        url: isSeries ? `https://embed.smashystream.com/playere.php?imdb=${imdbId}&s=${season}&e=${episode}` : `https://embed.smashystream.com/playere.php?imdb=${imdbId}`,
        quality: 'HD',
        id: 'smashystream'
      });

      if (tmdbId) {
        sources.push({
          name: 'Server Theta',
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
      setError("Failed to load video stream");
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

  const currentEpisodeName = episodes.find(ep => ep.episode_number === currentEpisode)?.name || `Episode ${currentEpisode}`;

  // Loading State
  if (loading) {
    return (
      <div className="video-player-overlay" style={styles.overlay} onClick={handleOverlayClick}>
        <div className="video-player-container" style={styles.player}>
          <div style={styles.centerContent}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>Connecting video stream...</p>
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
            <Film size={44} color="#ffffff" style={{ opacity: 0.8 }} />
            <p style={{ color: '#d4d4d8', fontSize: 16, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{error}</p>
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
        <button style={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>

        {/* Top Bar */}
        <div style={styles.topBar}>
          <div style={styles.mediaInfo}>
            <h3 style={styles.mediaTitle}>{media.title}</h3>
            {media.year && <span style={styles.mediaYear}>{media.year}</span>}
          </div>
          {(isSeries || isAnime) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button style={styles.episodeToggleBtn} onClick={() => setShowSelector(!showSelector)}>
                {isAnime ? `Episode ${currentEpisode} ▾` : `S${currentSeason} • E${currentEpisode} ▾`}
              </button>
            </div>
          )}
        </div>

        {/* Source Selector: Separate SUB and DUB server rows for Anime */}
        {isAnime ? (
          <div style={styles.animeServersModal}>
            <div style={styles.animeServerRowModal}>
              <span style={styles.subDubBadgeModal}>SUB</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ANIME_SERVERS.map(srv => {
                  const isActive = selectedAnimeServer === srv.id && animeLang === 'sub';
                  return (
                    <button
                      key={`sub-${srv.id}`}
                      style={{...styles.sourceBtn, ...(isActive ? styles.activeSource : {})}}
                      onClick={() => handleSelectAnimeServer(srv.id, 'sub')}
                    >
                      {srv.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={styles.animeServerRowModal}>
              <span style={styles.subDubBadgeModal}>DUB</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ANIME_SERVERS.map(srv => {
                  const isActive = selectedAnimeServer === srv.id && animeLang === 'dub';
                  return (
                    <button
                      key={`dub-${srv.id}`}
                      style={{...styles.sourceBtn, ...(isActive ? styles.activeSource : {})}}
                      onClick={() => handleSelectAnimeServer(srv.id, 'dub')}
                    >
                      {srv.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          sources.length > 1 && (
            <div style={styles.sourceSelector}>
              {sources.map((source, index) => (
                <button
                  key={source.id || index}
                  style={{...styles.sourceBtn, ...(index === currentSource ? styles.activeSource : {})}}
                  onClick={() => setCurrentSource(index)}
                >
                  {source.name}
                </button>
              ))}
            </div>
          )
        )}

        {/* Episode Selector Panel */}
        {(isSeries || isAnime) && showSelector && (
          <div style={styles.episodePanel}>
            <div style={styles.currentEpisodeInfo}>
              <span style={styles.currentEpisodeLabel}>Now Playing:</span>
              <span style={styles.currentEpisodeTitle}>
                {isAnime ? `Episode ${currentEpisode} of ${totalEpisodes}` : `Season ${currentSeason} • ${currentEpisodeName}`}
              </span>
            </div>

            {isAnime ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <div style={styles.animeModalSearchWrap}>
                    <Search size={13} color="#71717a" style={{ flexShrink: 0 }} />
                    <input
                      type="text"
                      value={episodeSearch}
                      onChange={(e) => setEpisodeSearch(e.target.value)}
                      placeholder="Jump to ep #..."
                      style={styles.animeModalSearchInput}
                    />
                    {episodeSearch && (
                      <button onClick={() => setEpisodeSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <X size={12} color="#a1a1aa" />
                      </button>
                    )}
                  </div>

                  <div style={styles.quickNav}>
                    <button
                      style={{...styles.navBtn, ...(currentEpisode <= 1 ? styles.navBtnDisabled : {})}}
                      onClick={() => currentEpisode > 1 && handleEpisodeChange(currentEpisode - 1)}
                      disabled={currentEpisode <= 1}
                    >
                      ◀ Prev
                    </button>
                    <span style={styles.episodeCounter}>{currentEpisode}/{totalEpisodes}</span>
                    <button
                      style={{...styles.navBtn, ...(currentEpisode >= totalEpisodes ? styles.navBtnDisabled : {})}}
                      onClick={() => currentEpisode < totalEpisodes && handleEpisodeChange(currentEpisode + 1)}
                      disabled={currentEpisode >= totalEpisodes}
                    >
                      Next ▶
                    </button>
                  </div>
                </div>

                {animeChunks.length > 1 && !episodeSearch && (
                  <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                    {animeChunks.map(chunk => (
                      <button
                        key={chunk.index}
                        onClick={() => setActiveChunkIndex(chunk.index)}
                        style={{
                          padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                          cursor: 'pointer', border: '1px solid',
                          background: chunk.index === activeChunkIndex ? '#ffffff' : 'rgba(255,255,255,0.06)',
                          borderColor: chunk.index === activeChunkIndex ? '#ffffff' : 'rgba(255,255,255,0.12)',
                          color: chunk.index === activeChunkIndex ? '#030304' : '#a1a1aa',
                          whiteSpace: 'nowrap',
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                        }}
                      >
                        {chunk.label}
                      </button>
                    ))}
                  </div>
                )}

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(42px, 1fr))',
                  gridAutoRows: '36px',
                  alignContent: 'start',
                  gap: 6, maxHeight: 180, overflowY: 'auto', paddingRight: 4,
                }}>
                  {visibleAnimeEpisodes.map(ep => {
                    const isActive = ep.episode_number === currentEpisode;
                    return (
                      <button
                        key={ep.episode_number}
                        onClick={() => handleEpisodeChange(ep.episode_number)}
                        style={{
                          height: 36, borderRadius: 6, cursor: 'pointer',
                          fontSize: 12, fontWeight: 600, border: '1px solid',
                          background: isActive ? '#ffffff' : 'rgba(255,255,255,0.04)',
                          borderColor: isActive ? '#ffffff' : 'rgba(255,255,255,0.1)',
                          color: isActive ? '#030304' : '#d4d4d8',
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                        }}
                      >
                        {ep.episode_number}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={styles.selectorRow}>
                {isSeries && (
                  <div style={styles.selectGroup}>
                    <label style={styles.selectLabel}>Season</label>
                    <select value={currentSeason} onChange={(e) => handleSeasonChange(Number(e.target.value))} style={styles.select}>
                      {seasons.map(s => (
                        <option key={s.season_number} value={s.season_number}>Season {s.season_number} ({s.episode_count} eps)</option>
                      ))}
                    </select>
                  </div>
                )}
                <div style={styles.selectGroup}>
                  <label style={styles.selectLabel}>Episode</label>
                  <select value={currentEpisode} onChange={(e) => handleEpisodeChange(Number(e.target.value))} style={styles.select}>
                    {episodes.map(ep => (
                      <option key={ep.episode_number} value={ep.episode_number}>
                        {`E${ep.episode_number} - ${ep.name}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.quickNav}>
                  <button
                    style={{...styles.navBtn, ...(currentEpisode <= 1 ? styles.navBtnDisabled : {})}}
                    onClick={() => currentEpisode > 1 && handleEpisodeChange(currentEpisode - 1)}
                    disabled={currentEpisode <= 1}
                  >
                    ◀ Prev
                  </button>
                  <span style={styles.episodeCounter}>{currentEpisode}/{totalEpisodes}</span>
                  <button
                    style={{...styles.navBtn, ...(currentEpisode >= totalEpisodes ? styles.navBtnDisabled : {})}}
                    onClick={() => currentEpisode < totalEpisodes && handleEpisodeChange(currentEpisode + 1)}
                    disabled={currentEpisode >= totalEpisodes}
                  >
                    Next ▶
                  </button>
                </div>
              </div>
            )}
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
    background: 'rgba(0, 0, 0, 0.92)', zIndex: 1100,
    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px',
  },
  player: {
    position: 'relative', width: '100%', maxWidth: '1200px', aspectRatio: '16/9',
    background: '#000', borderRadius: '16px', overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.16)',
    boxShadow: '0 30px 90px rgba(0,0,0,0.9), 0 0 30px rgba(255,255,255,0.08)',
  },
  videoWrapper: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1,
  },
  video: {
    width: '100%', height: '100%', border: 'none',
  },
  closeBtn: {
    position: 'absolute', top: '15px', right: '15px', zIndex: 20,
    background: 'rgba(10, 10, 14, 0.85)', color: '#ffffff',
    border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%',
    width: '38px', height: '38px', cursor: 'pointer', fontSize: '16px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(10px)', transition: 'all 0.2s',
  },
  topBar: {
    position: 'absolute', top: '15px', left: '15px', right: '65px', zIndex: 10,
    display: 'flex', alignItems: 'center', gap: '12px',
  },
  mediaInfo: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: 'rgba(10, 10, 14, 0.85)', padding: '8px 16px', borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.14)', backdropFilter: 'blur(12px)',
    flex: 1, minWidth: 0,
  },
  mediaTitle: {
    color: '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '15px',
    fontWeight: '700', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  mediaYear: {
    color: '#a1a1aa', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', fontWeight: '500', flexShrink: 0,
  },
  episodeToggleBtn: {
    background: 'rgba(10, 10, 14, 0.85)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '10px', padding: '8px 16px', cursor: 'pointer',
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap',
    backdropFilter: 'blur(12px)',
  },
  episodePanel: {
    position: 'absolute', top: '70px', left: '15px', right: '15px', zIndex: 15,
    background: 'rgba(12, 12, 18, 0.96)', borderRadius: '14px', padding: '20px',
    border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(24px)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.15)',
  },
  currentEpisodeInfo: {
    marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)',
    display: 'flex', alignItems: 'center', gap: '8px',
  },
  currentEpisodeLabel: {
    color: '#71717a', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
  },
  currentEpisodeTitle: {
    color: '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', fontWeight: '700',
  },
  selectorRow: {
    display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap',
  },
  selectGroup: {
    display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '150px',
  },
  selectLabel: {
    color: '#a1a1aa', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px',
  },
  select: {
    background: 'rgba(255, 255, 255, 0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px', padding: '10px 14px', fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: '13.5px', fontWeight: '500', cursor: 'pointer', outline: 'none', width: '100%',
  },
  quickNav: {
    display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto',
  },
  navBtn: {
    background: 'rgba(255, 255, 255, 0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: '8px', padding: '10px 16px', cursor: 'pointer',
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', fontWeight: '600', transition: 'all 0.2s',
  },
  navBtnDisabled: { opacity: 0.3, cursor: 'not-allowed' },
  episodeCounter: {
    color: '#a1a1aa', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', fontWeight: '600', padding: '0 8px',
  },
  sourceSelector: {
    position: 'absolute', top: '65px', left: '15px', zIndex: 10,
    display: 'flex', gap: '6px', flexWrap: 'wrap', maxWidth: 'calc(100% - 100px)',
  },
  animeServersModal: {
    position: 'absolute', top: '65px', left: '15px', zIndex: 10,
    display: 'flex', flexDirection: 'column', gap: '6px',
    background: 'rgba(10, 10, 14, 0.92)', padding: '8px 12px', borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.14)', backdropFilter: 'blur(16px)',
    maxWidth: 'calc(100% - 30px)',
  },
  animeServerRowModal: {
    display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap',
  },
  subDubBadgeModal: {
    fontSize: '9.5px', fontWeight: '800', letterSpacing: '0.06em',
    padding: '3px 6px', borderRadius: '4px',
    background: 'rgba(255,255,255,0.12)', color: '#ffffff',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    minWidth: '34px', textAlign: 'center',
  },
  animeModalSearchWrap: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px', padding: '6px 10px', flex: 1, maxWidth: '240px',
  },
  animeModalSearchInput: {
    background: 'none', border: 'none', outline: 'none',
    color: '#fff', fontSize: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif", width: '100%',
  },
  sourceBtn: {
    padding: '5px 12px', background: 'rgba(10, 10, 14, 0.85)', color: '#d4d4d8',
    border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', cursor: 'pointer',
    fontSize: '11px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: '600', whiteSpace: 'nowrap',
    backdropFilter: 'blur(8px)',
  },
  activeSource: { 
    background: '#ffffff', 
    color: '#030304', 
    border: '1px solid #ffffff', 
    boxShadow: '0 0 14px rgba(255,255,255,0.4)',
  },
  centerContent: {
    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
    height: '100%', color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", gap: '14px',
  },
  spinner: {
    width: '46px', height: '46px', border: '3px solid rgba(255,255,255,0.1)',
    borderTop: '3px solid #ffffff', borderRadius: '50%', animation: 'spin 1s linear infinite',
  },
  loadingText: { fontSize: '16px', fontWeight: '600', margin: 0, color: '#d4d4d8' },
  retryBtn: {
    padding: '11px 24px', background: '#ffffff', color: '#030304', border: 'none',
    borderRadius: '9px', cursor: 'pointer', fontSize: '14.5px', fontWeight: '700',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
};
