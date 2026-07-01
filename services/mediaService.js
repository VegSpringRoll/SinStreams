import axios from "axios";

// Point this to your Node.js backend URL
const BACKEND_URL = import.meta.env.PROD ? "/api" : "http://localhost:5000/api";

// ─── Helper: Fetch with retry logic ───
const fetchWithRetry = async (url, retries = 2, timeout = 10000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const { data } = await axios.get(url, { timeout });
      return data;
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed for ${url}:`, error.message);
      
      if (i === retries - 1) {
        console.error(`All ${retries} attempts failed for ${url}`);
        return [];
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};

// ─── MOVIES ───
export const getMovies = async () => {
  try {
    const data = await fetchWithRetry(`${BACKEND_URL}/media/movies`);
    return data;
  } catch (err) {
    console.error("Backend fetch movies error:", err.message);
    return [];
  }
};

// ─── SHOWS / SERIES ───
export const getShows = async () => {
  try {
    const data = await fetchWithRetry(`${BACKEND_URL}/media/series`);
    return data;
  } catch (err) {
    console.error("Backend fetch series error:", err.message);
    return [];
  }
};

// ─── UNIFIED SEARCH (Movies + Series) ───
export const searchMedia = async (query) => {
  if (!query || query.trim() === '') {
    return [];
  }

  try {
    const data = await fetchWithRetry(
      `${BACKEND_URL}/media/search?q=${encodeURIComponent(query.trim())}`
    );
    return data;
  } catch (err) {
    console.error("Backend search error:", err.message);
    return [];
  }
};

// ─── GET STREAMING URL ───
export const getStreamUrl = (imdbId, type = 'movie', season = null, episode = null) => {
  if (!imdbId) {
    console.warn("No IMDB ID provided for streaming");
    return null;
  }

  const encodedImdbId = encodeURIComponent(imdbId);

  if (type === 'movie') {
    return `https://vidsrc.to/embed/movie/${encodedImdbId}`;
  } else if (type === 'series' || type === 'tv') {
    if (season && episode) {
      return `https://vidsrc.to/embed/tv/${encodedImdbId}/${season}/${episode}`;
    }
    return `https://vidsrc.to/embed/tv/${encodedImdbId}/1/1`;
  }
  
  return null;
};

// ─── GET MULTIPLE STREAMING SOURCES ───
export const getStreamSources = (imdbId, type = 'movie', season = 1, episode = 1) => {
  if (!imdbId) return [];

  const encodedImdbId = encodeURIComponent(imdbId);
  const sources = [];

  if (type === 'movie') {
    sources.push({
      name: 'VidSrc',
      url: `https://vidsrc.to/embed/movie/${encodedImdbId}`,
      quality: 'Auto'
    });
  } else {
    sources.push({
      name: 'VidSrc',
      url: `https://vidsrc.to/embed/tv/${encodedImdbId}/${season || 1}/${episode || 1}`,
      quality: 'Auto'
    });
  }

  return sources;
};

// ─── WATCHLIST OPERATIONS ───
export const addToWatchlist = async (token, media) => {
  try {
    const { data } = await axios.post(
      `${BACKEND_URL}/user/watchlist`,
      { media },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return data;
  } catch (err) {
    console.error("Add to watchlist error:", err.message);
    throw err;
  }
};

export const getWatchlist = async (token) => {
  try {
    const { data } = await axios.get(
      `${BACKEND_URL}/user/watchlist`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return data;
  } catch (err) {
    console.error("Get watchlist error:", err.message);
    return [];
  }
};

export const removeFromWatchlist = async (token, mediaId) => {
  try {
    const { data } = await axios.delete(
      `${BACKEND_URL}/user/watchlist/${mediaId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return data;
  } catch (err) {
    console.error("Remove from watchlist error:", err.message);
    throw err;
  }
};

// ─── GET MOVIE STREAM ───
export const getMovieStream = async (imdbId, source = 'vidsrc') => {
  try {
    const { data } = await axios.get(`${BACKEND_URL}/stream/movie/${imdbId}`, {
      params: { source }
    });
    return data;
  } catch (err) {
    console.error("Get movie stream error:", err.message);
    return null;
  }
};

// ─── GET TV STREAM ───
export const getTVStream = async (imdbId, season, episode, source = 'vidsrc') => {
  try {
    const { data } = await axios.get(
      `${BACKEND_URL}/stream/tv/${imdbId}/${season}/${episode}`,
      { params: { source } }
    );
    return data;
  } catch (err) {
    console.error("Get TV stream error:", err.message);
    return null;
  }
};

// ─── GET ALL STREAM SOURCES ───
export const getAllStreamSources = async (imdbId, type = 'movie', season = 1, episode = 1) => {
  try {
    const { data } = await axios.get(`${BACKEND_URL}/stream/sources/${imdbId}`, {
      params: { type, season, episode }
    });
    return data.sources || [];
  } catch (err) {
    console.error("Get stream sources error:", err.message);
    return [];
  }
};

// ─── ANIME ───
export const getAnime = async () => {
  try {
    const data = await fetchWithRetry(`${BACKEND_URL}/anime/trending`);
    return data;
  } catch (err) {
    console.error("Get anime error:", err.message);
    return [];
  }
};

export const getPopularAnime = async () => {
  try {
    const data = await fetchWithRetry(`${BACKEND_URL}/anime/popular`);
    return data;
  } catch (err) {
    console.error("Get popular anime error:", err.message);
    return [];
  }
};

export const searchAnime = async (query) => {
  if (!query) return [];
  try {
    const data = await fetchWithRetry(`${BACKEND_URL}/anime/search?q=${encodeURIComponent(query)}`);
    return data;
  } catch (err) {
    console.error("Search anime error:", err.message);
    return [];
  }
};

// ─── TRENDING (Combined) ───
export const getTrending = async () => {
  try {
    const [movies, shows] = await Promise.all([
      getMovies(),
      getShows()
    ]);

    return {
      movies: movies.slice(0, 20),
      shows: shows.slice(0, 20),
      all: [...movies, ...shows]
    };
  } catch (err) {
    console.error("Get trending error:", err.message);
    return { movies: [], shows: [], all: [] };
  }
};