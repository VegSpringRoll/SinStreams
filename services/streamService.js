import axios from "axios";

// Primary streaming sources
const STREAM_SOURCES = {
  vidsrc: {
    movie: (imdbId) => `https://vidsrc.to/embed/movie/${imdbId}`,
    tv: (imdbId, season, episode) => `https://vidsrc.to/embed/tv/${imdbId}/${season}/${episode}`
  },
  vidsrcPro: {
    movie: (imdbId) => `https://vidsrc.pro/embed/movie/${imdbId}`,
    tv: (imdbId, season, episode) => `https://vidsrc.pro/embed/tv/${imdbId}/${season}/${episode}`
  },
  superEmbed: {
    movie: (imdbId) => `https://multiembed.mov/directstream.php?video_id=${imdbId}&tmdb=1`,
    tv: (imdbId, season, episode) => `https://multiembed.mov/directstream.php?video_id=${imdbId}&tmdb=1&s=${season}&e=${episode}`
  },
  vidsrcVIP: {
    movie: (imdbId) => `https://vidsrc.vip/embed/movie/${imdbId}`,
    tv: (imdbId, season, episode) => `https://vidsrc.vip/embed/tv/${imdbId}/${season}/${episode}`
  }
};

/**
 * Get streaming URL for a movie
 * @param {string} imdbId - IMDB ID (e.g., "tt1234567")
 * @param {string} source - Source name (default: 'vidsrc')
 * @returns {string} Streaming URL
 */
export const getMovieStreamUrl = (imdbId, source = 'vidsrc') => {
  if (!imdbId) {
    console.warn("No IMDB ID provided for movie stream");
    return null;
  }

  const sourceHandler = STREAM_SOURCES[source];
  if (!sourceHandler) {
    console.warn(`Unknown source: ${source}, falling back to vidsrc`);
    return STREAM_SOURCES.vidsrc.movie(imdbId);
  }

  return sourceHandler.movie(imdbId);
};

/**
 * Get streaming URL for a TV show
 * @param {string} imdbId - IMDB ID
 * @param {number} season - Season number
 * @param {number} episode - Episode number
 * @param {string} source - Source name (default: 'vidsrc')
 * @returns {string} Streaming URL
 */
export const getTVStreamUrl = (imdbId, season = 1, episode = 1, source = 'vidsrc') => {
  if (!imdbId) {
    console.warn("No IMDB ID provided for TV stream");
    return null;
  }

  const sourceHandler = STREAM_SOURCES[source];
  if (!sourceHandler) {
    console.warn(`Unknown source: ${source}, falling back to vidsrc`);
    return STREAM_SOURCES.vidsrc.tv(imdbId, season, episode);
  }

  return sourceHandler.tv(imdbId, season, episode);
};

/**
 * Get all available streaming sources for a media item
 * @param {string} imdbId - IMDB ID
 * @param {string} type - 'movie' or 'series'
 * @param {number} season - Season number (for series)
 * @param {number} episode - Episode number (for series)
 * @returns {Array} Array of source objects with name and url
 */
export const getAllStreamSources = (imdbId, type = 'movie', season = 1, episode = 1) => {
  if (!imdbId) return [];

  const sources = [];
  
  Object.entries(STREAM_SOURCES).forEach(([name, handler]) => {
    try {
      const url = type === 'movie' 
        ? handler.movie(imdbId)
        : handler.tv(imdbId, season, episode);
      
      sources.push({
        name: formatSourceName(name),
        url,
        quality: 'Auto',
        id: name
      });
    } catch (error) {
      console.warn(`Failed to generate URL for ${name}:`, error.message);
    }
  });

  return sources;
};

/**
 * Format source name for display
 */
const formatSourceName = (name) => {
  const names = {
    vidsrc: 'VidSrc',
    vidsrcPro: 'VidSrc PRO',
    superEmbed: 'SuperEmbed',
    vidsrcVIP: 'VidSrc VIP'
  };
  return names[name] || name;
};

/**
 * Get IMDB ID from TMDB ID
 * @param {string} tmdbId - TMDB ID
 * @param {string} type - 'movie' or 'tv'
 * @returns {Promise<string>} IMDB ID
 */
export const getIMDBIdFromTMDB = async (tmdbId, type = 'movie') => {
  try {
    const apiKey = process.env.TMDB_KEY;
    const endpoint = type === 'movie' 
      ? `https://api.themoviedb.org/3/movie/${tmdbId}/external_ids`
      : `https://api.themoviedb.org/3/tv/${tmdbId}/external_ids`;
    
    const { data } = await axios.get(endpoint, {
      params: { api_key: apiKey }
    });
    
    return data.imdb_id || null;
  } catch (error) {
    console.error("Failed to fetch IMDB ID:", error.message);
    return null;
  }
};

/**
 * Validate if a stream URL is accessible
 * @param {string} url - Stream URL to check
 * @returns {Promise<boolean>}
 */
export const validateStreamUrl = async (url) => {
  try {
    const response = await axios.head(url, { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    return false;
  }
};

/**
 * Get the best available streaming source
 * @param {string} imdbId - IMDB ID
 * @param {string} type - 'movie' or 'series'
 * @param {number} season - Season number
 * @param {number} episode - Episode number
 * @returns {Promise<Object>} Best source object
 */
export const getBestStreamSource = async (imdbId, type = 'movie', season = 1, episode = 1) => {
  const sources = getAllStreamSources(imdbId, type, season, episode);
  
  // Try to validate each source (optional - can be slow)
  // For now, just return the first source
  return sources[0] || null;
};