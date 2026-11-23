import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import MediaCard from "../components/MediaCard";
import { Star, Clock, Calendar, ArrowLeft, Play, Monitor, Tv, Maximize, Minimize, Sparkles, ChevronLeft, ChevronRight, ChevronDown, Search, X } from "lucide-react";
import { getMovies, getShows } from "../../services/mediaService";
import { saveLastWatched } from "../../services/Watchhistory";
import { getAnimeDetails, getPopularAnime, resolveEpisodeCount } from "../../services/animeService";

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
    subUrl: (ani, mal, ep) => `https://aniembed.se/e/${ani || mal}/${ep}?lang=sub`,
    dubUrl: (ani, mal, ep) => `https://aniembed.se/e/${ani || mal}/${ep}?lang=dub`,
  },
];

const CHUNK_SIZE = 100;

export default function Watch() {
  const location = useLocation();
  const navigate = useNavigate();
  const { type: routeType, id: routeId } = useParams();
  const [media, setMedia] = useState(location.state?.media || null);
  const autoPlay = location.state?.autoPlay || false;
  // Optional resume point passed from a "Continue Watching" card
  const startSeason = location.state?.startSeason || null;
  const startEpisode = location.state?.startEpisode || null;

  const [animeLang, setAnimeLang] = useState('sub'); // 'sub' | 'dub'
  const [selectedAnimeServer, setSelectedAnimeServer] = useState('ichigo');
  const [activeChunkIndex, setActiveChunkIndex] = useState(0);
  const [episodeSearch, setEpisodeSearch] = useState('');
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

  // Direct fetch fallback if user navigates / reloads directly
  useEffect(() => {
    if (media) return;
    if (!routeId) return;

    const resolveMedia = async () => {
      try {
        if (routeType === 'anime') {
          const animeData = await getAnimeDetails(routeId);
          if (animeData) setMedia(animeData);
        } else if (routeType === 'tv' || routeType === 'series') {
          const { data } = await axios.get(`https://api.themoviedb.org/3/tv/${routeId}`, {
            params: { api_key: TMDB_API_KEY, append_to_response: 'external_ids' }
          });
          setMedia({
            _id: String(data.id),
            id: String(data.id),
            tmdbId: data.id,
            imdb_id: data.external_ids?.imdb_id,
            title: data.name,
            type: 'series',
            year: data.first_air_date?.substring(0, 4),
            rating: { percentage: Math.round(data.vote_average * 10) },
            images: { poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null },
            genres: data.genres?.map(g => g.name) || [],
            synopsis: data.overview,
            number_of_seasons: data.number_of_seasons,
            number_of_episodes: data.number_of_episodes,
            seasons: data.seasons,
          });
        } else {
          const { data } = await axios.get(`https://api.themoviedb.org/3/movie/${routeId}`, {
            params: { api_key: TMDB_API_KEY, append_to_response: 'external_ids' }
          });
          setMedia({
            _id: String(data.id),
            imdb_id: data.imdb_id || data.external_ids?.imdb_id,
            title: data.title,
            type: 'movie',
            year: data.release_date?.substring(0, 4),
            rating: { percentage: Math.round(data.vote_average * 10) },
            images: { poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null },
          });
        }
      } catch (err) {
        console.warn("Could not resolve media for watch page:", err.message);
      }
    };

    resolveMedia();
  }, [media, routeType, routeId]);

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

  const seasonTrackRef = useRef(null);
  const activeSeasonBtnRef = useRef(null);

  const isAnime = media?.type === 'anime' || routeType === 'anime';
  const isSeries = !isAnime && (media?.type === 'series' || media?.type === 'tv' || routeType === 'series' || routeType === 'tv');

  const scrollSeasonTrack = (direction) => {
    if (seasonTrackRef.current) {
      const amount = seasonTrackRef.current.clientWidth * 0.7 * direction;
      seasonTrackRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (activeSeasonBtnRef.current) {
      activeSeasonBtnRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [currentSeason]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);

    if (media) {
      if (isAnime) {
        setupAnimeEpisodes();
      } else if (isSeries) {
        fetchShowDetails();
      } else {
        fetchStreamSources(media.imdb_id, 1, 1);
      }
      fetchRecommendations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media, isAnime]);

  const setupAnimeEpisodes = async () => {
    let count = resolveEpisodeCount(media);
    const animeId = media?.anilist_id || media?._id || media?.id;

    if ((!count || count <= 12) && animeId) {
      try {
        const full = await getAnimeDetails(animeId);
        if (full?.episodes && full.episodes > count) {
          count = full.episodes;
          setMedia(prev => ({ ...prev, episodes: count }));
        }
      } catch (err) {
        // ignore
      }
    }

    const epList = Array.from({ length: count }, (_, i) => ({
      episode_number: i + 1,
      name: `Episode ${i + 1}`,
    }));
    setEpisodes(epList);
    setTotalEpisodes(count);

    const targetEp = startEpisode && startEpisode <= count ? startEpisode : 1;
    setCurrentEpisode(targetEp);
    const chunkIdx = Math.floor((targetEp - 1) / CHUNK_SIZE);
    setActiveChunkIndex(chunkIdx);
    fetchStreamSources(null, 1, targetEp);
  };

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

  const currentEpisodeName = useMemo(() => {
    return episodes.find(ep => ep.episode_number === currentEpisode)?.name || `Episode ${currentEpisode}`;
  }, [episodes, currentEpisode]);

  const handleSelectAnimeServer = (serverId, lang) => {
    setSelectedAnimeServer(serverId);
    setAnimeLang(lang);
    const anilistId = media?.anilist_id || media?._id || media?.id;
    const malId = media?.mal_id;
    const srv = ANIME_SERVERS.find(s => s.id === serverId) || ANIME_SERVERS[0];
    const targetUrl = lang === 'dub'
      ? srv.dubUrl(anilistId, malId, currentEpisode)
      : srv.subUrl(anilistId, malId, currentEpisode);

    setSources([{ name: srv.name, url: targetUrl }]);
    setCurrentSource(0);
  };

  // Keep "Continue Watching" up to date
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

  // Fetch show details for series
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
          overview: ep.overview,
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

  const handleSeasonChange = async (seasonNum) => {
    setCurrentSeason(seasonNum);
    setCurrentEpisode(1);
    await fetchEpisodesForSeason(seasonNum);
    fetchStreamSources(media?.imdb_id, seasonNum, 1);
  };

  const handleEpisodeChange = (episodeNum) => {
    setCurrentEpisode(episodeNum);
    if (isAnime) {
      const chunkIdx = Math.floor((episodeNum - 1) / CHUNK_SIZE);
      setActiveChunkIndex(chunkIdx);
      const anilistId = media?.anilist_id || media?._id || media?.id;
      const malId = media?.mal_id;
      const srv = ANIME_SERVERS.find(s => s.id === selectedAnimeServer) || ANIME_SERVERS[0];
      const targetUrl = animeLang === 'dub'
        ? srv.dubUrl(anilistId, malId, episodeNum)
        : srv.subUrl(anilistId, malId, episodeNum);
      setSources([{ name: srv.name, url: targetUrl }]);
      setCurrentSource(0);
    } else {
      fetchStreamSources(media?.imdb_id, currentSeason, episodeNum);
    }
  };

  // Fetch video streaming sources
  const fetchStreamSources = async (imdbId, season = 1, episode = 1) => {
    try {
      setLoadingSources(true);
      setUseDirect(false);
      setDirectUrl(null);

      // Handle Anime sources (Ichigo, Yuki Suo, Hinata, Makima)
      if (isAnime) {
        const anilistId = media?.anilist_id || media?._id || media?.id;
        const malId = media?.mal_id;
        const ep = episode || currentEpisode || 1;
        const srv = ANIME_SERVERS.find(s => s.id === selectedAnimeServer) || ANIME_SERVERS[0];
        const targetUrl = animeLang === 'dub'
          ? srv.dubUrl(anilistId, malId, ep)
          : srv.subUrl(anilistId, malId, ep);

        setSources([{ name: srv.name, url: targetUrl }]);
        setCurrentSource(0);
        setLoadingSources(false);
        return;
      }

      const type = isSeries ? 'tv' : 'movie';
      const tmdbId = media?._id || media?.id;
      const anyId = tmdbId || imdbId;
      const seriesFlag = isSeries;

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

      if (tmdbId) {
        sources.push({
          name: 'Server Alpha',
          url: seriesFlag
            ? `https://vidspark.to/tv/${tmdbId || anyId}/${season}/${episode}?autoPlay=true`
            : `https://vidspark.to/movie/${tmdbId || anyId}?autoPlay=true`,
          quality: 'HD', id: 'vidlux'
        });
      }

      sources.push({
        name: 'Server Beta',
        url: seriesFlag
          ? `https://vidcore.net/tv/${tmdbId || anyId}/${season}/${episode}?color=ffffff`
          : `https://vidcore.net/movie/${tmdbId || anyId}?color=ffffff`,
        quality: 'HD', id: 'vidsrcwtf'
      });

      sources.push({
        name: 'Server Gamma (Fast)',
        url: seriesFlag ? `https://vidsrc.to/embed/tv/${imdbId || anyId}/${season}/${episode}` : `https://vidsrc.to/embed/movie/${imdbId || anyId}`,
        quality: 'HD', id: 'vidsrc'
      });
      sources.push({
        name: 'Server Delta',
        url: seriesFlag ? `https://www.2embed.cc/embedtv/${tmdbId || anyId}&s=${season}&e=${episode}` : `https://www.2embed.cc/embed/${tmdbId || anyId}`,
        quality: 'HD', id: '2embed'
      });
      sources.push({
        name: 'Server Epsilon (4K)',
        url: seriesFlag ? `https://player.videasy.net/tv/${tmdbId || anyId}/${season}/${episode}` 
          : `https://player.videasy.net/movie/${tmdbId || anyId}`,
        quality: 'HD/4K', id: 'vidnest'
      });
      sources.push({
        name: 'Server Zeta',
        url: seriesFlag ? `https://embed.smashystream.com/playere.php?imdb=${imdbId || anyId}&s=${season}&e=${episode}` : `https://embed.smashystream.com/playere.php?imdb=${imdbId || anyId}`,
        quality: 'HD', id: 'smashystream'
      });

      if (tmdbId) {
        sources.push({ name: 'Server Theta', url: seriesFlag ? `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}` : `https://vidlink.pro/movie/${tmdbId}`, quality: 'HD', id: 'vidlink' });
      }

      setSources(sources);
      setCurrentSource(0);
      setLoadingSources(false);
    } catch (err) {
      console.error("Failed to fetch sources:", err);
      setLoadingSources(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      setLoadingRecs(true);
      if (isAnime) {
        const animeList = await getPopularAnime(1, 12);
        setRecommendations(animeList.filter(a => a.id !== media?._id && a.id !== media?.id));
        return;
      }
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
        <h2 style={{ color: '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Session lost or title not found</h2>
        <button onClick={() => navigate('/')} style={styles.homeBtn}>Return Home</button>
      </div>
    );
  }

  return (
    <div className="page-content watch-page-root" style={styles.container}>
      {/* Back Button */}
      <div className="anime-top-nav" style={styles.topNav}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <ArrowLeft size={16} /> Return
        </button>
      </div>

      {/* ANIME: Beside-the-player Theater Stage with Dedicated Episode Selector Panel */}
      {isAnime ? (
        <div className="anime-theater">
          {/* Left Column: Player & Dual Server Rows (SUB & DUB) */}
          <div className="anime-video-col">
            <div className="anime-video-wrapper">
              {loadingSources ? (
                <div style={styles.videoPlaceholder}>
                  <div style={styles.spinner} />
                  <p style={{ color: '#a1a1aa', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: 16 }}>Connecting video stream...</p>
                </div>
              ) : (
                <div ref={videoWrapperRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
                  <iframe
                    key={`${selectedAnimeServer}-${animeLang}-${currentEpisode}`}
                    src={sources[0]?.url}
                    style={styles.video}
                    allowFullScreen
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    title={`${media.title} Episode ${currentEpisode}`}
                  />
                </div>
              )}
            </div>

            {/* Now Playing Bar */}
            <div className="anime-control-bar">
              <div style={styles.episodeInfo}>
                <span style={styles.episodeLabel}>Now Playing</span>
                <span style={styles.episodeValue}>
                  Episode {currentEpisode} of {totalEpisodes}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  disabled={currentEpisode <= 1}
                  onClick={() => handleEpisodeChange(currentEpisode - 1)}
                  style={{
                    padding: '6px 14px', borderRadius: 8, cursor: currentEpisode <= 1 ? 'not-allowed' : 'pointer',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                    color: currentEpisode <= 1 ? '#52525b' : '#ffffff', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
                    fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600,
                  }}
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <button
                  disabled={currentEpisode >= totalEpisodes}
                  onClick={() => handleEpisodeChange(currentEpisode + 1)}
                  style={{
                    padding: '6px 14px', borderRadius: 8, cursor: currentEpisode >= totalEpisodes ? 'not-allowed' : 'pointer',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                    color: currentEpisode >= totalEpisodes ? '#52525b' : '#ffffff', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
                    fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600,
                  }}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Dedicated Dual Server Rows: SUB and DUB */}
            <div className="anime-servers-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <Monitor size={14} color="#a1a1aa" />
                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#71717a', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Streaming Servers
                </span>
              </div>

              {/* Row 1: SUB SERVERS */}
              <div className="anime-server-row">
                <span className="anime-server-badge-sub">SUB</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                  {ANIME_SERVERS.map(srv => {
                    const isActive = selectedAnimeServer === srv.id && animeLang === 'sub';
                    return (
                      <button
                        key={`sub-${srv.id}`}
                        className={`anime-server-btn ${isActive ? 'anime-server-btn-active' : ''}`}
                        onClick={() => handleSelectAnimeServer(srv.id, 'sub')}
                      >
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: isActive ? '#030304' : 'rgba(255,255,255,0.35)',
                        }} />
                        {srv.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 2: DUB SERVERS */}
              <div className="anime-server-row">
                <span className="anime-server-badge-dub">DUB</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                  {ANIME_SERVERS.map(srv => {
                    const isActive = selectedAnimeServer === srv.id && animeLang === 'dub';
                    return (
                      <button
                        key={`dub-${srv.id}`}
                        className={`anime-server-btn ${isActive ? 'anime-server-btn-active' : ''}`}
                        onClick={() => handleSelectAnimeServer(srv.id, 'dub')}
                      >
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: isActive ? '#030304' : 'rgba(255,255,255,0.35)',
                        }} />
                        {srv.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Dedicated Episode & Season / Range Selector beside Video Player */}
          <div className="anime-side-panel">
            <div className="anime-side-header">
              <h3 className="anime-side-title">
                <Tv size={15} color="#ffffff" />
                Episodes
              </h3>
              <span className="anime-total-badge">{totalEpisodes} Total</span>
            </div>

            {/* Quick Episode Jump Search Input */}
            <div className="anime-jump-search">
              <Search size={14} color="#71717a" style={{ flexShrink: 0 }} />
              <input
                type="text"
                value={episodeSearch}
                onChange={(e) => setEpisodeSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const num = parseInt(episodeSearch.trim(), 10);
                    if (!isNaN(num) && num >= 1 && num <= totalEpisodes) {
                      handleEpisodeChange(num);
                    }
                  }
                }}
                placeholder="Jump to ep # (e.g. 842)..."
                className="anime-jump-input"
              />
              {episodeSearch && (
                <button
                  onClick={() => setEpisodeSearch('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                >
                  <X size={13} color="#a1a1aa" />
                </button>
              )}
            </div>

            {/* Batch Range Tabs (Chunks of 100 for long series like One Piece) */}
            {animeChunks.length > 1 && !episodeSearch && (
              <div className="hide-scrollbar anime-chunk-list">
                {animeChunks.map(chunk => {
                  const isChunkActive = chunk.index === activeChunkIndex;
                  return (
                    <button
                      key={chunk.index}
                      className={`anime-chunk-pill ${isChunkActive ? 'anime-chunk-pill-active' : ''}`}
                      onClick={() => setActiveChunkIndex(chunk.index)}
                    >
                      {chunk.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Episode Grid Table */}
            <div className="hide-scrollbar anime-ep-grid">
              {visibleAnimeEpisodes.length > 0 ? (
                visibleAnimeEpisodes.map(ep => {
                  const isActive = ep.episode_number === currentEpisode;
                  return (
                    <button
                      key={ep.episode_number}
                      className={`anime-ep-cell ${isActive ? 'anime-ep-cell-active' : ''}`}
                      onClick={() => handleEpisodeChange(ep.episode_number)}
                      title={`Episode ${ep.episode_number}`}
                    >
                      {ep.episode_number}
                    </button>
                  );
                })
              ) : (
                <div style={{ padding: '24px 8px', textAlign: 'center', gridColumn: '1 / -1', color: '#71717a', fontSize: 13 }}>
                  No episodes match "{episodeSearch}"
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* STANDARD MOVIES & SERIES LAYOUT */
        <>
          {/* Video Section */}
          <div className="watch-video" style={styles.videoSection}>
            {loadingSources ? (
              <div style={styles.videoPlaceholder}>
                <div style={styles.spinner} />
                <p style={{ color: '#a1a1aa', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: 16 }}>Connecting video stream...</p>
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
                  <span style={styles.episodeValue}>
                    {`Season ${currentSeason} • ${currentEpisodeName}`}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
                  <button
                    disabled={currentEpisode <= 1}
                    onClick={() => handleEpisodeChange(currentEpisode - 1)}
                    style={{
                      padding: '6px 12px', borderRadius: 8, cursor: currentEpisode <= 1 ? 'not-allowed' : 'pointer',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                      color: currentEpisode <= 1 ? '#52525b' : '#ffffff', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
                      fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600,
                    }}
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <button
                    disabled={currentEpisode >= totalEpisodes}
                    onClick={() => handleEpisodeChange(currentEpisode + 1)}
                    style={{
                      padding: '6px 12px', borderRadius: 8, cursor: currentEpisode >= totalEpisodes ? 'not-allowed' : 'pointer',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                      color: currentEpisode >= totalEpisodes ? '#52525b' : '#ffffff', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
                      fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600,
                    }}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Source Selector */}
            {sources.length > 0 && (
              <div style={{ ...styles.sourceBar, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={styles.sourceLabel}>
                    <Monitor size={15} color="#ffffff" /> Stream Source:
                  </span>
                  <div className="source-buttons" style={styles.sourceButtons}>
                    {sources.map((source, index) => (
                      <button
                        key={source.id || index}
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
                        {sourceErrors[index] ? '✕ ' : ''}{source.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Episodes list (series only) */}
          {isSeries && (
            <div className="watch-episodes" style={{ ...styles.episodesSection, padding: isMobile ? '24px 16px' : '36px 32px' }}>
              <div style={styles.episodesHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <h2 style={{ ...styles.sectionTitle, fontSize: isMobile ? 18 : 22, margin: 0 }}>Episodes</h2>
                  {totalEpisodes > 0 && <span style={styles.episodesCount}>{totalEpisodes} episodes</span>}
                </div>

                {/* Season Quick-Jump Dropdown when many seasons */}
                {seasons.length > 3 && (
                  <div className="season-select-wrapper">
                    <span className="season-select-label">Season:</span>
                    <div className="season-dropdown-box">
                      <select
                        value={currentSeason}
                        onChange={(e) => handleSeasonChange(Number(e.target.value))}
                        className="season-dropdown-native"
                        aria-label="Select Season"
                      >
                        {seasons.map(s => (
                          <option key={s.season_number} value={s.season_number}>
                            {s.name} {s.episode_count ? `(${s.episode_count} eps)` : ''}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="season-dropdown-chevron" />
                    </div>
                  </div>
                )}
              </div>

              {seasons.length > 1 && (
                <div className="season-slider-container">
                  {seasons.length > 6 && (
                    <button
                      className="season-slider-nav prev"
                      onClick={() => scrollSeasonTrack(-1)}
                      aria-label="Previous seasons"
                    >
                      <ChevronLeft size={16} />
                    </button>
                  )}
                  <div
                    ref={seasonTrackRef}
                    className="season-pills-track hide-scrollbar"
                  >
                    {seasons.map(s => {
                      const isActive = s.season_number === currentSeason;
                      return (
                        <button
                          key={s.season_number}
                          ref={isActive ? activeSeasonBtnRef : null}
                          onClick={() => handleSeasonChange(s.season_number)}
                          className={`season-pill-btn ${isActive ? 'season-pill-btn-active' : ''}`}
                        >
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                  {seasons.length > 6 && (
                    <button
                      className="season-slider-nav next"
                      onClick={() => scrollSeasonTrack(1)}
                      aria-label="Next seasons"
                    >
                      <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              )}

              <div style={styles.episodeList}>
                {episodesLoading ? (
                  [1,2,3].map(i => (
                    <div key={i} style={styles.episodeCard}>
                      <div className="mv-sk" style={{ ...styles.episodeThumbWrap, background: '#121218' }} />
                      <div style={{ flex: 1 }}>
                        <div className="mv-sk" style={{ width: '60%', height: 14, borderRadius: 4, marginBottom: 8 }} />
                        <div className="mv-sk" style={{ width: '90%', height: 12, borderRadius: 4 }} />
                      </div>
                    </div>
                  ))
                ) : episodes.length > 0 ? (
                  episodes.map(ep => {
                    const isActive = ep.episode_number === currentEpisode;
                    const thumbImg = ep.still || media.images?.fanart || media.images?.poster;
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
                          {thumbImg ? (
                            <img src={thumbImg} alt={ep.name} style={styles.episodeThumb} loading="lazy" />
                          ) : (
                            <div style={styles.episodeThumbFallback}>
                              <Tv size={isMobile ? 20 : 26} color="#71717a" />
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
                  <p style={{ color: '#71717a', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14 }}>
                    No episode data available.
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Details Section */}
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
              {media.year && <span style={styles.metaItem}><Calendar size={14} /> {media.year}</span>}
              {media.rating && (
                <span style={styles.rating}>
                  <Star size={14} fill="#ffffff" color="#ffffff" /> {typeof media.rating === 'object' ? (media.rating.percentage / 10).toFixed(1) : media.rating}
                </span>
              )}
              {media.runtime > 0 && <span style={styles.metaItem}><Clock size={14} /> {media.runtime} min</span>}
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
      <div style={{ ...styles.recommendationsSection, padding: isMobile ? '24px 0 32px' : '36px 32px' }}>
        <h2 style={{ ...styles.sectionTitle, padding: isMobile ? '0 16px' : 0, fontSize: isMobile ? 18 : 22 }}>
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
          <p style={{ color: '#71717a', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: isMobile ? '0 16px' : 0 }}>
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
    background: linear-gradient(90deg, #09090d 25%, #181822 50%, #09090d 75%);
    background-size: 200% 100%;
    animation: wv-shimmer 1.4s ease infinite;
  }
  .hide-scrollbar::-webkit-scrollbar { display: none; }
  .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }

  .episode-card { 
    transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.02);
  }
  .episode-card:hover { 
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.18);
  }
  @media (hover: hover) and (pointer: fine) {
    .episode-card:hover .episode-play-overlay { opacity: 1; }
  }
  .episode-play-overlay { opacity: 0; transition: opacity 0.2s ease; }

  @keyframes wv-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

  .watch-page-root {
    width: 100%;
    max-width: 100vw;
    overflow-x: hidden;
    box-sizing: border-box;
  }

  /* Anime Beside-The-Player Theater Layout */
  .anime-theater {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 380px;
    gap: 24px;
    padding: 20px 32px 32px;
    max-width: 1680px;
    margin: 0 auto;
    align-items: start;
    width: 100%;
    box-sizing: border-box;
  }
  @media (max-width: 960px) {
    .anime-theater {
      display: flex !important;
      flex-direction: column !important;
      width: 100% !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
      padding: 12px 14px 24px !important;
      gap: 16px !important;
      overflow-x: hidden !important;
    }
  }

  .anime-video-col {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
    max-width: 100%;
    width: 100%;
    box-sizing: border-box;
  }

  .anime-video-wrapper {
    width: 100%;
    max-width: 100%;
    aspect-ratio: 16 / 9;
    background: #000000;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6);
    box-sizing: border-box;
  }

  .anime-control-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 18px;
    border-radius: 12px;
    background: rgba(14, 14, 18, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    flex-wrap: wrap;
    gap: 12px;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  .anime-servers-box {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px 18px;
    border-radius: 12px;
    background: rgba(14, 14, 18, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  .anime-server-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  .anime-server-badge-sub {
    font-size: 10.5px;
    font-weight: 800;
    letter-spacing: 0.08em;
    padding: 5px 9px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.12);
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.22);
    font-family: 'Plus Jakarta Sans', sans-serif;
    min-width: 44px;
    text-align: center;
    flex-shrink: 0;
  }

  .anime-server-badge-dub {
    font-size: 10.5px;
    font-weight: 800;
    letter-spacing: 0.08em;
    padding: 5px 9px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.06);
    color: #a1a1aa;
    border: 1px solid rgba(255, 255, 255, 0.14);
    font-family: 'Plus Jakarta Sans', sans-serif;
    min-width: 44px;
    text-align: center;
    flex-shrink: 0;
  }

  .anime-server-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 13px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.04);
    color: #d4d4d8;
    cursor: pointer;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 12px;
    font-weight: 600;
    transition: all 0.18s ease;
    white-space: nowrap;
    box-sizing: border-box;
  }
  .anime-server-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.25);
    color: #ffffff;
  }
  .anime-server-btn-active {
    background: #ffffff !important;
    color: #030304 !important;
    border-color: #ffffff !important;
    box-shadow: 0 0 16px rgba(255, 255, 255, 0.4) !important;
    font-weight: 700 !important;
  }

  .anime-side-panel {
    display: flex;
    flex-direction: column;
    border-radius: 14px;
    background: rgba(14, 14, 18, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    padding: 16px;
    height: 580px;
    box-shadow: 0 14px 36px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }
  @media (max-width: 960px) {
    .anime-side-panel {
      height: 460px;
      padding: 14px;
    }
    .anime-control-bar {
      padding: 10px 12px !important;
    }
    .anime-servers-box {
      padding: 12px 12px !important;
    }
    .anime-server-btn {
      padding: 6px 10px !important;
      font-size: 11.5px !important;
    }
    .anime-top-nav {
      padding: 10px 14px !important;
    }
  }

  .anime-side-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .anime-side-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: #ffffff;
    margin: 0;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .anime-total-badge {
    font-size: 11px;
    font-weight: 600;
    color: #a1a1aa;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 2px 8px;
    border-radius: 12px;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }

  .anime-jump-search {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.12);
    margin-bottom: 10px;
    width: 100%;
    box-sizing: border-box;
  }

  .anime-jump-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    color: #ffffff;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 12.5px;
    min-width: 0;
  }
  .anime-jump-input::placeholder {
    color: #71717a;
  }

  .anime-chunk-list {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding-bottom: 6px;
    margin-bottom: 10px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
  }

  .anime-chunk-pill {
    flex-shrink: 0;
    padding: 5px 11px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    font-family: 'Plus Jakarta Sans', sans-serif;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #a1a1aa;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
  }
  .anime-chunk-pill:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.2);
  }
  .anime-chunk-pill-active {
    background: #ffffff !important;
    color: #030304 !important;
    border-color: #ffffff !important;
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.3) !important;
    font-weight: 700 !important;
  }

  .anime-ep-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(42px, 1fr));
    grid-auto-rows: 40px;
    align-content: start;
    gap: 6px;
    overflow-y: auto;
    flex: 1;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding-right: 4px;
  }

  .anime-ep-cell {
    height: 40px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.03);
    color: #d4d4d8;
    cursor: pointer;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 12px;
    font-weight: 600;
    transition: all 0.15s ease;
  }
  .anime-ep-cell:hover {
    background: rgba(255, 255, 255, 0.12) !important;
    border-color: rgba(255, 255, 255, 0.25) !important;
    color: #ffffff !important;
  }
  .anime-ep-cell-active {
    background: #ffffff !important;
    color: #030304 !important;
    border-color: #ffffff !important;
    font-weight: 800 !important;
    box-shadow: 0 0 14px rgba(255, 255, 255, 0.4) !important;
  }

  /* Season Slider & Dropdown Navigation */
  .season-select-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }
  .season-select-label {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 12px;
    font-weight: 600;
    color: #71717a;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .season-dropdown-box {
    position: relative;
    display: flex;
    align-items: center;
  }
  .season-dropdown-native {
    appearance: none;
    -webkit-appearance: none;
    background: rgba(20, 20, 26, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 8px;
    color: #ffffff;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 13px;
    font-weight: 600;
    padding: 7px 32px 7px 14px;
    cursor: pointer;
    outline: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    transition: all 0.2s ease;
  }
  .season-dropdown-native:hover, .season-dropdown-native:focus {
    border-color: rgba(255, 255, 255, 0.4);
    box-shadow: 0 0 16px rgba(255, 255, 255, 0.15);
  }
  .season-dropdown-chevron {
    position: absolute;
    right: 10px;
    pointer-events: none;
    color: #a1a1aa;
  }

  .season-slider-container {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    margin-bottom: 20px;
    box-sizing: border-box;
  }
  .season-pills-track {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
    padding: 4px 2px;
    width: 100%;
    box-sizing: border-box;
  }
  .season-slider-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: rgba(20, 20, 26, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.16);
    color: #ffffff;
    cursor: pointer;
    flex-shrink: 0;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.6);
    transition: all 0.2s ease;
    z-index: 2;
  }
  .season-slider-nav:hover {
    background: #ffffff;
    color: #030304;
    border-color: #ffffff;
    box-shadow: 0 0 16px rgba(255, 255, 255, 0.4);
  }
  .season-pill-btn {
    flex-shrink: 0;
    padding: 8px 18px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #a1a1aa;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s ease;
  }
  .season-pill-btn:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.25);
    color: #ffffff;
  }
  .season-pill-btn-active {
    background: #ffffff !important;
    border-color: #ffffff !important;
    color: #030304 !important;
    font-weight: 700 !important;
    box-shadow: 0 0 16px rgba(255, 255, 255, 0.3) !important;
  }

  @media (max-width: 768px) {
    .season-slider-nav {
      display: none;
    }
    .season-select-wrapper {
      width: 100%;
      margin-left: 0;
      margin-top: 6px;
      justify-content: space-between;
    }
    .season-dropdown-native {
      width: 100%;
      font-size: 13px;
      padding: 8px 30px 8px 12px;
    }
    .season-pill-btn {
      padding: 6px 14px;
      font-size: 12px;
    }
  }
`;

const styles = {
  container: {
    background: '#030304',
    minHeight: '100vh',
    paddingTop: 68,
    width: '100%',
    maxWidth: '100vw',
    overflowX: 'hidden',
    boxSizing: 'border-box',
  },
  errorPage: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#030304',
    gap: 20,
  },
  homeBtn: {
    padding: '12px 28px',
    background: '#ffffff',
    color: '#030304',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 15,
    fontWeight: 700,
    boxShadow: '0 0 20px rgba(255, 255, 255, 0.3)',
  },
  topNav: {
    padding: '12px 32px',
    background: 'rgba(10, 10, 14, 0.95)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    width: '100%',
    maxWidth: 1680,
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'none',
    border: 'none',
    color: '#a1a1aa',
    cursor: 'pointer',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 14,
    fontWeight: 500,
    transition: 'color 0.2s',
  },
  videoSection: {
    width: '100%',
    background: '#000000',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  videoPlaceholder: {
    width: '100%',
    aspectRatio: '16/9',
    maxHeight: '70vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#070709',
  },
  videoWrapper: {
    width: '100%',
    aspectRatio: '16/9',
    maxHeight: '72vh',
    background: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
  controlsSection: {
    background: 'rgba(14, 14, 18, 0.95)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '16px 32px',
  },
  episodeBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
    padding: '10px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  },
  episodeInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  episodeLabel: {
    color: '#71717a',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  episodeValue: {
    color: '#ffffff',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 15,
    fontWeight: 600,
  },
  sourceBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    padding: '6px 0',
  },
  sourceLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: '#d4d4d8',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 13,
    fontWeight: 600,
    flexShrink: 0,
  },
  sourceButtons: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  sourceBtn: {
    padding: '8px 16px',
    background: 'rgba(255, 255, 255, 0.06)',
    color: '#d4d4d8',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 12.5,
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  sourceBtnActive: {
    background: '#ffffff',
    color: '#030304',
    border: '1px solid #ffffff',
    boxShadow: '0 0 16px rgba(255, 255, 255, 0.35)',
    fontWeight: 700,
  },

  episodesSection: {
    maxWidth: 1200,
    margin: '0 auto',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  },
  episodesHeader: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  episodesCount: {
    color: '#71717a',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 12,
    fontWeight: 500,
  },
  seasonPillRow: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    paddingBottom: 6,
    marginBottom: 20,
  },
  seasonPill: {
    flexShrink: 0,
    padding: '8px 18px',
    borderRadius: 20,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#a1a1aa',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
  },
  seasonPillActive: {
    background: '#ffffff',
    borderColor: '#ffffff',
    color: '#030304',
    boxShadow: '0 0 16px rgba(255, 255, 255, 0.3)',
  },
  episodeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  episodeCard: {
    display: 'flex',
    gap: 14,
    padding: 12,
    borderRadius: 12,
    cursor: 'pointer',
    alignItems: 'flex-start',
  },
  episodeCardActive: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 0 20px rgba(255, 255, 255, 0.1)',
  },
  episodeThumbWrap: {
    position: 'relative',
    flexShrink: 0,
    width: 140,
    aspectRatio: '16/9',
    borderRadius: 8,
    overflow: 'hidden',
    background: '#09090d',
    border: '1px solid rgba(255, 255, 255, 0.1)',
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
    background: 'linear-gradient(135deg, #0f0f15, #08080c)',
  },
  episodeNumBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    background: 'rgba(0,0,0,0.8)',
    color: '#fff',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 5,
    border: '1px solid rgba(255, 255, 255, 0.12)',
  },
  episodeRuntimeBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    background: 'rgba(0,0,0,0.8)',
    color: '#d4d4d8',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
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
    background: 'rgba(0,0,0,0.4)',
  },
  nowPlayingBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    background: '#ffffff',
    color: '#030304',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
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
    background: '#030304',
    animation: 'wv-pulse 1.4s ease infinite',
  },
  episodeInfoCol: {
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
  },
  episodeTitleText: {
    color: '#ffffff',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 14.5,
    fontWeight: 600,
    marginBottom: 4,
  },
  episodeOverview: {
    color: '#a1a1aa',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 12.5,
    lineHeight: 1.5,
    margin: 0,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },

  detailsSection: {
    padding: '36px 32px',
    maxWidth: 1200,
    margin: '0 auto',
  },
  detailsContent: {
    display: 'flex',
    gap: 32,
    flexWrap: 'wrap',
    background: 'rgba(16, 16, 22, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 18,
    padding: '28px',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
  },
  posterContainer: {
    flexShrink: 0,
    width: 200,
    borderRadius: 12,
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 16px 40px rgba(0,0,0,0.7)',
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
    fontFamily: "'Cinzel', 'Playfair Display', serif",
    fontSize: 'clamp(24px, 3vw, 40px)',
    fontWeight: 900,
    color: '#fff',
    marginBottom: 12,
  },
  metaRow: {
    display: 'flex',
    gap: 18,
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: '#a1a1aa',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 13.5,
  },
  rating: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    color: '#ffffff',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
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
    padding: '5px 12px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 20,
    color: '#ffffff',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 12,
    textTransform: 'capitalize',
  },
  synopsis: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 14.5,
    lineHeight: 1.75,
    color: '#d4d4d8',
    maxWidth: 750,
  },
  recommendationsSection: {
    maxWidth: 1200,
    margin: '0 auto',
  },
  sectionTitle: {
    fontFamily: "'Cinzel', serif",
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 700,
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
    width: 42,
    height: 42,
    border: '3px solid rgba(255,255,255,0.1)',
    borderTop: '3px solid #ffffff',
    borderRadius: '50%',
    animation: 'spin 0.9s linear infinite',
  },
};
