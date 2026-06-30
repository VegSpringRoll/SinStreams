import axios from "axios";

const TMDB_BASE = "https://api.themoviedb.org/3";
const API_KEY = process.env.TMDB_KEY;

// Cache for TMDB requests
const cache = new Map();
const CACHE_DURATION = 3600000; // 1 hour

const getCached = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCache = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

// 🎬 Get Trending Movies
export const getTrendingMovies = async () => {
  const cacheKey = "trending_movies";
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const { data } = await axios.get(`${TMDB_BASE}/trending/movie/week`, {
      params: { api_key: API_KEY, language: "en-US" }
    });

    const movies = await Promise.all(
      data.results.slice(0, 40).map(async (movie) => {
        // Get IMDB ID for each movie
        let imdb_id = null;
        try {
          const { data: details } = await axios.get(
            `${TMDB_BASE}/movie/${movie.id}/external_ids`,
            { params: { api_key: API_KEY } }
          );
          imdb_id = details.imdb_id;
        } catch (err) {
          console.log(`Could not fetch IMDB ID for ${movie.title}`);
        }

        return {
          _id: String(movie.id),
          title: movie.title,
          imdb_id,
          type: "movie",
          year: movie.release_date ? movie.release_date.substring(0, 4) : "N/A",
          rating: {
            percentage: Math.round(movie.vote_average * 10),
            votes: movie.vote_count
          },
          images: {
            poster: movie.poster_path
              ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
              : null,
            fanart: movie.backdrop_path
              ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
              : null
          },
          synopsis: movie.overview || "No description available.",
          genres: movie.genre_ids || [],
          runtime: null,
          releaseDate: movie.release_date
        };
      })
    );

    setCache(cacheKey, movies);
    return movies;
  } catch (error) {
    console.error("TMDB Trending Movies Error:", error.message);
    return [];
  }
};

// 📺 Get Popular TV Shows
export const getPopularTVShows = async () => {
  const cacheKey = "popular_tv";
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const { data } = await axios.get(`${TMDB_BASE}/tv/popular`, {
      params: { api_key: API_KEY, language: "en-US" }
    });

    const shows = await Promise.all(
      data.results.slice(0, 40).map(async (show) => {
        let imdb_id = null;
        try {
          const { data: details } = await axios.get(
            `${TMDB_BASE}/tv/${show.id}/external_ids`,
            { params: { api_key: API_KEY } }
          );
          imdb_id = details.imdb_id;
        } catch (err) {
          console.log(`Could not fetch IMDB ID for ${show.name}`);
        }

        return {
          _id: String(show.id),
          title: show.name,
          imdb_id,
          type: "series",
          year: show.first_air_date ? show.first_air_date.substring(0, 4) : "N/A",
          rating: {
            percentage: Math.round(show.vote_average * 10),
            votes: show.vote_count
          },
          images: {
            poster: show.poster_path
              ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
              : null,
            fanart: show.backdrop_path
              ? `https://image.tmdb.org/t/p/original${show.backdrop_path}`
              : null
          },
          synopsis: show.overview || "No description available.",
          genres: show.genre_ids || [],
          runtime: null,
          firstAirDate: show.first_air_date
        };
      })
    );

    setCache(cacheKey, shows);
    return shows;
  } catch (error) {
    console.error("TMDB Popular TV Error:", error.message);
    return [];
  }
};

// 🔍 Search Multi (Movies + TV)
export const searchTMDB = async (query) => {
  if (!query) return [];

  const cacheKey = `search_${query}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const { data } = await axios.get(`${TMDB_BASE}/search/multi`, {
      params: {
        api_key: API_KEY,
        query,
        language: "en-US",
        include_adult: false
      }
    });

    const results = await Promise.all(
      data.results
        .filter(
          (item) =>
            item.media_type === "movie" || item.media_type === "tv"
        )
        .map(async (item) => {
          const isMovie = item.media_type === "movie";
          let imdb_id = null;

          try {
            const { data: details } = await axios.get(
              `${TMDB_BASE}/${item.media_type}/${item.id}/external_ids`,
              { params: { api_key: API_KEY } }
            );
            imdb_id = details.imdb_id;
          } catch (err) {
            // Silently fail for IMDB ID
          }

          return {
            _id: String(item.id),
            title: isMovie ? item.title : item.name,
            imdb_id,
            type: isMovie ? "movie" : "series",
            year: isMovie
              ? item.release_date?.substring(0, 4) || "N/A"
              : item.first_air_date?.substring(0, 4) || "N/A",
            rating: {
              percentage: Math.round(item.vote_average * 10),
              votes: item.vote_count
            },
            images: {
              poster: item.poster_path
                ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                : null,
              fanart: item.backdrop_path
                ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
                : null
            },
            synopsis: item.overview || "No description available.",
            genres: item.genre_ids || [],
            runtime: null
          };
        })
    );

    setCache(cacheKey, results);
    return results;
  } catch (error) {
    console.error("TMDB Search Error:", error.message);
    return [];
  }
};

// 🎯 Get Movie Details
export const getMovieDetails = async (movieId) => {
  try {
    const { data } = await axios.get(`${TMDB_BASE}/movie/${movieId}`, {
      params: {
        api_key: API_KEY,
        append_to_response: "videos,credits,external_ids"
      }
    });
    return data;
  } catch (error) {
    console.error("Get Movie Details Error:", error.message);
    return null;
  }
};

// 🎯 Get TV Show Details
export const getTVDetails = async (tvId) => {
  try {
    const { data } = await axios.get(`${TMDB_BASE}/tv/${tvId}`, {
      params: {
        api_key: API_KEY,
        append_to_response: "videos,credits,external_ids"
      }
    });
    return data;
  } catch (error) {
    console.error("Get TV Details Error:", error.message);
    return null;
  }
};