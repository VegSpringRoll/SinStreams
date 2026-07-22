import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import MediaCard from "../components/MediaCard";
import { Star, Clock, Calendar, ArrowLeft, Play, Monitor, Tv, Maximize, Minimize } from "lucide-react";
import { getMovies, getShows } from "../../services/mediaService";
import { saveLastWatched } from "../../services/Watchhistory";

const BACKEND_URL = import.meta.env.PROD ? "/api" : "http://localhost:5000/api";
const TMDB_API_KEY = '8ade991ea509eefe3cca2142132d753a';

export default function Watch() {
  const location = useLocation();
  const navigate = useNavigate();
  const media = location.state?.media;
  const autoPlay = location.state?.autoPlay || false;
  // Optional resume point passed from a "Continue Watching" card
  const startSeason = location.state?.startSeason || null;
  const startEpisode = location.state?.startEpisode || null;

  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );

  // Video source states
  const [sources, setSources] = useState([]);
  const [currentSource, setCurrentSource] = useState(0);
  const [loadingSources, setLoadingSources] = useState(true);
  const [directUrl, setDirectUrl] = useState(null);
  const [videoType, setVideoType] = useState(null);
  const [useDirect, setUseDirect] = useState(false);
  const [sourceErrors, setSourceErrors] = useState({});
  const videoWrapperRef = useRef(null);
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

  // Season & Episode State
  const [currentSeason, setCurrentSeason] = useState(1);
  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [seasons, setSeasons] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [totalEpisodes, setTotalEpisodes] = useState(0);
  const [showDetails, setShowDetails] = useState(null);

  const isSeries = media?.type === 'series' || media?.type === 'tv';

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);

    if (media) {
      if (isSeries) {
        fetchShowDetails();
      } else {
        fetchStreamSources(media.imdb_id, 1, 1);
      }
      fetchRecommendations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media]);

  // Keep "Continue Watching" up to date with whatever's actually on screen.
  useEffect(() => {
    if (!media) return;
    if (isSeries) {
      if (!currentSeason || !currentEpisode) return;
      const epName = episodes.find(e => e.episode_number === currentEpisode)?.name || null;
      saveLastWatched(media, { season: currentSeason, episode: currentEpisode, episodeName: epName });
    } else {
      saveLastWatched(media, {});
    }
  }, [media, isSeries, currentSeason, currentEpisode, episodes]);

  // Fetch show details for series (seasons list + resolves a resume point if provided)
  const fetchShowDetails = async () => {
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
        const requestedSeason = startSeason && actualSeasons.some(s => s.season_number === startSeason)
          ? startSeason
          : actualSeasons[0].season_number;

        setCurrentSeason(requestedSeason);

        const episodeList = await fetchEpisodesForSeason(requestedSeason);

        const requestedEpisode = startEpisode && episodeList.some(e => e.episode_number === startEpisode)
          ? startEpisode
          : 1;

        setCurrentEpisode(requestedEpisode);
        fetchStreamSources(media.imdb_id, requestedSeason, requestedEpisode);
      }
    } catch (err) {
      console.log("Could not fetch show details:", err.message);
    }
  };

  // Fetch episodes for a season (with stills/overview/runtime for the banner list)
  const fetchEpisodesForSeason = async (seasonNum) => {
    try {
      setEpisodesLoading(true);
      const tmdbId = media._id || media.id;
      if (!tmdbId) return [];

      const { data } = await axios.get(
        `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNum}`,
        { params: { api_key: TMDB_API_KEY } }
      );

      const episodeList = data.episodes
        ?.filter(ep => ep.episode_number > 0)
        .map(ep => ({
          episode_number: ep.episode_number,
          name: ep.name || `Episode ${ep.episode_number}`,
          overview: ep.overview || '',
          still: ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : null,
          runtime: ep.runtime || null,
        })) || [];

      setEpisodes(episodeList);
      setTotalEpisodes(episodeList.length);
      return episodeList;
    } catch (err) {
      console.log("Could not fetch episodes:", err.message);
      return [];
    } finally {
      setEpisodesLoading(false);
    }
  };

  // Handle season change
  const handleSeasonChange = async (seasonNum) => {
    if (seasonNum === currentSeason) return;
    setCurrentSeason(seasonNum);
    setCurrentEpisode(1);
    await fetchEpisodesForSeason(seasonNum);
    fetchStreamSources(media.imdb_id, seasonNum, 1);
  };

  // Handle episode change
  const handleEpisodeChange = (episodeNum) => {
    if (episodeNum === currentEpisode) return;
    setCurrentEpisode(episodeNum);
    fetchStreamSources(media.imdb_id, currentSeason, episodeNum);
    // Scroll to the player so the switch feels immediate, especially on mobile
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Fetch streaming sources
  const fetchStreamSources = async (imdbId, season = 1, episode = 1) => {
    try {
      setLoadingSources(true);
      setSourceErrors({});
      setUseDirect(false);

      const seriesFlag = media.type === 'series' || media.type === 'tv';
      const tmdbId = media._id || media.id;
      const anyId = imdbId || tmdbId;
      const type = seriesFlag ? 'tv' : 'movie';

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

      // #1 - VIDLUX
      if (tmdbId) {
        sources.push({
          name: 'God👑',
          url: seriesFlag
            ? `https://vsembed.ru/embed/tv/${tmdbId || anyId}/${season}/${episode}?autoPlay=true`
            : `https://vsembed.ru/embed/movie/${tmdbId || anyId}?autoPlay=true`,
          quality: 'HD', id: 'vidlux'
        });
      }

      // #2 - VIDSRC.WTF 
      sources.push({
        name: 'DemiGod👑',
        url: seriesFlag
          ? `https://vidcore.net/tv/${tmdbId || anyId}/${season}/${episode}?color=e8b84b`
          : `https://vidcore.net/movie/${tmdbId || anyId}?color=e8b84b`,
        quality: 'HD', id: 'vidsrcwtf'
      });

      sources.push({
        name: 'Fastest⚡',
        url: seriesFlag ? `https://vidsrc.to/embed/tv/${imdbId || anyId}/${season}/${episode}` : `https://vidsrc.to/embed/movie/${imdbId || anyId}`,
        quality: 'HD', id: 'vidsrc'
      });
      sources.push({
        name: '2embed',
        url: seriesFlag ? `https://www.2embed.cc/embedtv/${tmdbId || anyId}&s=${season}&e=${episode}` : `https://www.2embed.cc/embed/${tmdbId || anyId}`,
        quality: 'HD', id: '2embed'
      });
      sources.push({
        name: 'HD Elite👑',
        url: seriesFlag ? `https://rivestream.ru/embed/tv/${tmdbId || anyId}/${season}/${episode}` 
          : `https://rivestream.ru/embed/movie/${tmdbId || anyId}`,
        quality: 'HD/4K', id: 'vidnest'
      });
      sources.push({
        name: 'Premium HD 🔥',
        url: seriesFlag ? `https://embed.smashystream.com/playere.php?imdb=${imdbId || anyId}&s=${season}&e=${episode}` : `https://embed.smashystream.com/playere.php?imdb=${imdbId || anyId}`,
        quality: 'HD', id: 'smashystream'
      });

      if (tmdbId) {
        sources.push({ name: 'VidLink', url: seriesFlag ? `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}` : `https://vidlink.pro/movie/${tmdbId}`, quality: 'HD', id: 'vidlink' });
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

      const [movies, series] = await Promise.all([
        getMovies(),
        getShows()
      ]);

      const recs = [...(movies || []), ...(series || [])]
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
    <div className="page-content" style={styles.container}>
      {/* Back Button */}
      <div style={styles.topNav}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <ArrowLeft size={18} /> Back
        </button>
      </div>

      {/* Video Section */}
      <div className="watch-video" style={styles.videoSection}>
        {loadingSources ? (
          <div style={styles.videoPlaceholder}>
            <div style={styles.spinner} />
            <p style={{ color: '#888', fontFamily: "'DM Sans', sans-serif", marginTop: 16 }}>Loading video sources...</p>
          </div>
        ) : (
          <div ref={videoWrapperRef} style={{ ...styles.videoWrapper, position: 'relative' }}>
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
      <div className="controls-section" style={styles.controlsSection}>
        {isSeries && (
          <div className="episode-bar" style={styles.episodeBar}>
            <div style={styles.episodeInfo}>
              <span style={styles.episodeLabel}>Now Playing</span>
              <span style={styles.episodeValue}>Season {currentSeason} • {currentEpisodeName}</span>
            </div>
          </div>
        )}

        {/* Source Selector */}
        {sources.length > 0 && (
          <div style={styles.sourceBar}>
            <span style={styles.sourceLabel}>
              <Monitor size={16} /> Streaming Server:
            </span>
            <div className="source-buttons" style={styles.sourceButtons}>
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

      {/* Episodes — season pills + playable banner list (series only) */}
      {isSeries && (
        <div className="watch-episodes" style={{ ...styles.episodesSection, padding: isMobile ? '24px 16px' : '32px' }}>
          <div style={styles.episodesHeader}>
            <h2 style={{ ...styles.sectionTitle, fontSize: isMobile ? 17 : 20, margin: 0 }}>Episodes</h2>
            {totalEpisodes > 0 && <span style={styles.episodesCount}>{totalEpisodes} episodes</span>}
          </div>

          {seasons.length > 1 && (
            <div className="season-pills hide-scrollbar" style={styles.seasonPillRow}>
              {seasons.map(s => (
                <button
                  key={s.season_number}
                  onClick={() => handleSeasonChange(s.season_number)}
                  style={{
                    ...styles.seasonPill,
                    ...(s.season_number === currentSeason ? styles.seasonPillActive : {})
                  }}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}

          <div style={styles.episodeList}>
            {episodesLoading ? (
              [1,2,3].map(i => (
                <div key={i} style={styles.episodeCard}>
                  <div className="mv-sk" style={{ ...styles.episodeThumbWrap, background: '#1a2235' }} />
                  <div style={{ flex: 1 }}>
                    <div className="mv-sk" style={{ width: '60%', height: 14, borderRadius: 4, marginBottom: 8 }} />
                    <div className="mv-sk" style={{ width: '90%', height: 12, borderRadius: 4 }} />
                  </div>
                </div>
              ))
            ) : episodes.length > 0 ? (
              episodes.map(ep => {
                const isActive = ep.episode_number === currentEpisode;
                return (
                  <div
                    key={ep.episode_number}
                    className="episode-card"
                    onClick={() => handleEpisodeChange(ep.episode_number)}
                    style={{
                      ...styles.episodeCard,
                      ...(isActive ? styles.episodeCardActive : {}),
                    }}
                  >
                    <div style={styles.episodeThumbWrap}>
                      {ep.still ? (
                        <img src={ep.still} alt={ep.name} style={styles.episodeThumb} loading="lazy" />
                      ) : (
                        <div style={styles.episodeThumbFallback}>
                          <Tv size={isMobile ? 20 : 26} color="#3a4560" />
                        </div>
                      )}
                      <div style={styles.episodeNumBadge}>{ep.episode_number}</div>
                      {!isActive && (
                        <div className="episode-play-overlay" style={styles.episodePlayOverlay}>
                          <Play size={18} fill="#fff" color="#fff" />
                        </div>
                      )}
                      {isActive && (
                        <div style={styles.nowPlayingBadge}>
                          <span style={styles.nowPlayingDot} /> Playing
                        </div>
                      )}
                      {ep.runtime && <div style={styles.episodeRuntimeBadge}>{ep.runtime}m</div>}
                    </div>
                    <div style={styles.episodeInfoCol}>
                      <div style={styles.episodeTitleText}>
                        {ep.episode_number}. {ep.name}
                      </div>
                      {ep.overview && (
                        <p style={styles.episodeOverview}>{ep.overview}</p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p style={{ color: '#666', fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>
                No episode data available for this season.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Movie Details */}
      <div className="watch-details" style={styles.detailsSection}>
        <div style={styles.detailsContent}>
          {media.images?.poster && (
            <div className="watch-poster" style={styles.posterContainer}>
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
      <div style={{ ...styles.recommendationsSection, padding: isMobile ? '24px 0 32px' : '32px' }}>
        <h2 style={{ ...styles.sectionTitle, padding: isMobile ? '0 16px' : 0, fontSize: isMobile ? 17 : 20 }}>
          You May Also Like
        </h2>
        {loadingRecs ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div style={styles.spinner} />
          </div>
        ) : recommendations.length > 0 ? (
          isMobile ? (
            <div className="hide-scrollbar" style={styles.recRowMobile}>
              {recommendations.map((rec, i) => (
                <div key={rec._id || i} style={styles.recCardMobile}>
                  <MediaCard media={rec} type={rec.type || "movie"} index={i} size="sm" />
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.recGrid}>
              {recommendations.map((rec, i) => (
                <MediaCard key={rec._id || i} media={rec} type={rec.type || "movie"} index={i} size="md" />
              ))}
            </div>
          )
        ) : (
          <p style={{ color: '#666', fontFamily: "'DM Sans', sans-serif", padding: isMobile ? '0 16px' : 0 }}>
            No recommendations available.
          </p>
        )}
      </div>

      <style>{WATCH_CSS}</style>
    </div>
  );
}

const WATCH_CSS = `
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  @keyframes wv-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  .mv-sk {
    background: linear-gradient(90deg, #0d1420 25%, #1a2235 50%, #0d1420 75%);
    background-size: 200% 100%;
    animation: wv-shimmer 1.4s ease infinite;
  }
  .hide-scrollbar::-webkit-scrollbar { display: none; }
  .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }

  .episode-card { transition: background 0.2s ease, transform 0.15s ease; }
  .episode-card:hover { background: rgba(255,255,255,0.04); }
  @media (hover: hover) and (pointer: fine) {
    .episode-card:hover .episode-play-overlay { opacity: 1; }
  }
  .episode-play-overlay { opacity: 0; transition: opacity 0.2s ease; }

  @keyframes wv-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
`;

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
  fullscreenBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 8,
    background: 'rgba(10,10,10,0.7)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 5,
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

  // ── Episodes section ──
  episodesSection: {
    maxWidth: 1200,
    margin: '0 auto',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  episodesHeader: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  episodesCount: {
    color: '#3a4560',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    fontWeight: 500,
  },
  seasonPillRow: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    paddingBottom: 4,
    marginBottom: 20,
  },
  seasonPill: {
    flexShrink: 0,
    padding: '8px 18px',
    borderRadius: 20,
    background: '#12192a',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#8892a4',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
  },
  seasonPillActive: {
    background: '#e8b84b',
    borderColor: '#e8b84b',
    color: '#080c14',
  },
  episodeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  episodeCard: {
    display: 'flex',
    gap: 14,
    padding: 10,
    borderRadius: 10,
    cursor: 'pointer',
    alignItems: 'flex-start',
  },
  episodeCardActive: {
    background: 'rgba(232,184,75,0.08)',
    border: '1px solid rgba(232,184,75,0.25)',
  },
  episodeThumbWrap: {
    position: 'relative',
    flexShrink: 0,
    width: 140,
    aspectRatio: '16/9',
    borderRadius: 8,
    overflow: 'hidden',
    background: '#0d1420',
  },
  episodeThumb: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  episodeThumbFallback: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #12192a, #0a0f1a)',
  },
  episodeNumBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    background: 'rgba(0,0,0,0.75)',
    color: '#fff',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 5,
  },
  episodeRuntimeBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    background: 'rgba(0,0,0,0.75)',
    color: '#ccc',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: 4,
  },
  episodePlayOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.35)',
  },
  nowPlayingBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    background: '#e8b84b',
    color: '#080c14',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  nowPlayingDot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: '#080c14',
    animation: 'wv-pulse 1.4s ease infinite',
  },
  episodeInfoCol: {
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
  },
  episodeTitleText: {
    color: '#e8eaf0',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 4,
  },
  episodeOverview: {
    color: '#6878a0',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12.5,
    lineHeight: 1.5,
    margin: 0,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
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
  recRowMobile: {
    display: 'flex',
    gap: 10,
    overflowX: 'auto',
    padding: '4px 16px 8px',
    scrollSnapType: 'x mandatory',
  },
  recCardMobile: {
    flexShrink: 0,
    scrollSnapAlign: 'start',
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