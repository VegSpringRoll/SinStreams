import express from "express";
import axios from "axios";
import { getTrendingMovies, getPopularTVShows, getMovieDetails, getTVDetails } from "../services/tmdbService.js";

const router = express.Router();

// 🎬 GET TRENDING MOVIES - WITH IMDB IDs
router.get('/movies', async (req, res) => {
  try {
    console.log("📡 Fetching trending movies with IMDB IDs...");
    
    const apiKey = process.env.TMDB_KEY;
    
    // Step 1: Get trending movies
    const response = await axios.get('https://api.themoviedb.org/3/trending/movie/week', {
      params: {
        api_key: apiKey,
        language: 'en-US'
      }
    });
    
    if (!response.data?.results || response.data.results.length === 0) {
      return res.json([]);
    }
    
    // Step 2: Get IMDB IDs for each movie
    const moviesWithIMDB = await Promise.all(
      response.data.results.slice(0, 40).map(async (movie) => {
        let imdb_id = null;
        
        try {
          const { data: externalIds } = await axios.get(
            `https://api.themoviedb.org/3/movie/${movie.id}/external_ids`,
            { params: { api_key: apiKey } }
          );
          imdb_id = externalIds.imdb_id;
        } catch (err) {
          console.log(`⚠️ Could not fetch IMDB ID for ${movie.title}`);
        }
        
        return {
          _id: String(movie.id),
          title: movie.title,
          imdb_id: imdb_id, // Now we have the IMDB ID!
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
    
    console.log(`✅ Fetched ${moviesWithIMDB.length} movies with IMDB IDs`);
    console.log(`📊 Movies with IMDB: ${moviesWithIMDB.filter(m => m.imdb_id).length}/${moviesWithIMDB.length}`);
    
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json(moviesWithIMDB);
    
  } catch (error) {
    console.error("❌ Movies Error:", error.message);
    res.json([]);
  }
});
    

// 📺 GET POPULAR TV SHOWS - WITH IMDB IDs
router.get('/series', async (req, res) => {
  try {
    console.log("📡 Fetching popular TV shows with IMDB IDs...");
    
    const apiKey = process.env.TMDB_KEY;
    
    // Step 1: Get popular TV shows
    const response = await axios.get('https://api.themoviedb.org/3/tv/popular', {
      params: {
        api_key: apiKey,
        language: 'en-US'
      }
    });
    
    if (!response.data?.results || response.data.results.length === 0) {
      // Fallback to TVMaze
      return fallbackToTVMaze(res);
    }
    
    // Step 2: Get IMDB IDs for each show
    const showsWithIMDB = await Promise.all(
      response.data.results.slice(0, 40).map(async (show) => {
        let imdb_id = null;
        
        try {
          const { data: externalIds } = await axios.get(
            `https://api.themoviedb.org/3/tv/${show.id}/external_ids`,
            { params: { api_key: apiKey } }
          );
          imdb_id = externalIds.imdb_id;
        } catch (err) {
          console.log(`⚠️ Could not fetch IMDB ID for ${show.name}`);
        }
        
        return {
          _id: String(show.id),
          title: show.name,
          imdb_id: imdb_id, // Now we have the IMDB ID!
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
    
    console.log(`✅ Fetched ${showsWithIMDB.length} shows with IMDB IDs`);
    console.log(`📊 Shows with IMDB: ${showsWithIMDB.filter(s => s.imdb_id).length}/${showsWithIMDB.length}`);
    
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json(showsWithIMDB);
    
  } catch (error) {
    console.error("❌ Series Error:", error.message);
    // Fallback to TVMaze
    await fallbackToTVMaze(res);
  }
});

// TVMaze Fallback Function
async function fallbackToTVMaze(res) {
  try {
    console.log("⚠️ Falling back to TVMaze...");
    const { data } = await axios.get("https://api.tvmaze.com/shows", {
      timeout: 8000
    });

    const formattedSeries = data
      .filter(show => show.externals && show.externals.imdb)
      .slice(0, 40)
      .map(show => ({
        _id: String(show.id),
        title: show.name,
        imdb_id: show.externals?.imdb,
        type: "series",
        year: show.premiered ? show.premiered.substring(0, 4) : "N/A",
        rating: { 
          percentage: show.rating?.average ? Math.round(show.rating.average * 10) : null 
        },
        images: {
          poster: show.image?.original || show.image?.medium,
          fanart: show.image?.original || show.image?.medium
        },
        synopsis: show.summary 
          ? show.summary.replace(/<[^>]*>?/gm, '') 
          : "No description available.",
        genres: show.genres || [],
        runtime: show.averageRuntime,
      }));

    console.log(`✅ TVMaze fallback: ${formattedSeries.length} shows`);
    res.json(formattedSeries);
  } catch (fallbackError) {
    console.error("❌ TVMaze fallback failed:", fallbackError.message);
    res.json([]);
  }
}
// ─── UNIFIED SEARCH (Movies + Series) ───
router.get('/search', async (req, res) => {
  const query = req.query.q;
  
  if (!query || query.trim() === '') {
    return res.json([]);
  }

  try {
    console.log(`🔍 Searching TMDB for: "${query}"`);
    
    // 🔑 Get API key directly
    const apiKey = process.env.TMDB_KEY;
    
    // Check if key exists
    if (!apiKey) {
      console.error("❌ TMDB_KEY is not set!");
      throw new Error("API key missing");
    }
    
    console.log("Using API Key:", apiKey.substring(0, 5) + "...");
    
    // Direct TMDB API call
    const response = await axios.get('https://api.themoviedb.org/3/search/multi', {
      params: {
        api_key: apiKey,
        query: query.trim(),
        language: 'en-US',
        include_adult: false
      }
    });
    
    console.log(`TMDB returned ${response.data?.results?.length || 0} results`);
    
    if (!response.data?.results || response.data.results.length === 0) {
      return res.json([]);
    }
    
    // Format results
    const results = response.data.results
      .filter(item => item.media_type === "movie" || item.media_type === "tv")
      .slice(0, 20)
      .map(item => ({
        _id: String(item.id),
        title: item.media_type === "movie" ? item.title : item.name,
        imdb_id: null, // Skip for search speed
        type: item.media_type === "movie" ? "movie" : "series",
        year: item.media_type === "movie"
          ? item.release_date?.substring(0, 4) || "N/A"
          : item.first_air_date?.substring(0, 4) || "N/A",
        rating: {
          percentage: Math.round(item.vote_average * 10),
          votes: item.vote_count
        },
        images: {
          poster: item.poster_path 
            ? `https://image.tmdb.org/t/p/w200${item.poster_path}` 
            : null,
          fanart: item.backdrop_path 
            ? `https://image.tmdb.org/t/p/w500${item.backdrop_path}` 
            : null
        },
        synopsis: item.overview || "No description available.",
        genres: item.genre_ids || [],
        runtime: null
      }));
    
    console.log(`✅ Found ${results.length} results for "${query}"`);
    res.json(results);
    
  } catch (error) {
    console.error("❌ TMDB Search Error:", error.message);
    
    // Fallback to YTS + TVMaze
    try {
      console.log("⚠️ Trying YTS + TVMaze fallback search...");
      
      const [ytsResponse, tvmazeResponse] = await Promise.all([
        axios.get(`https://yts.mx/api/v2/list_movies.json?query_term=${encodeURIComponent(query)}`)
          .catch(() => ({ data: { data: { movies: [] } } })),
        axios.get(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`)
          .catch(() => ({ data: [] }))
      ]);

      const moviesRaw = ytsResponse.data?.data?.movies || [];
      const seriesRaw = tvmazeResponse.data || [];

      const formattedMovies = moviesRaw.map(movie => ({
        _id: String(movie.id),
        title: movie.title,
        imdb_id: movie.imdb_code,
        type: "movie",
        year: movie.year,
        rating: { percentage: movie.rating * 10 },
        images: {
          poster: movie.large_cover_image || movie.medium_cover_image,
          fanart: movie.background_image_original || movie.background_image
        },
        synopsis: movie.description_full || movie.summary || "No description available.",
        genres: movie.genres || [],
        runtime: movie.runtime,
      }));

      const formattedSeries = seriesRaw
        .filter(item => item.show?.externals?.imdb)
        .map(item => {
          const show = item.show;
          return {
            _id: String(show.id),
            title: show.name,
            imdb_id: show.externals.imdb,
            type: "series",
            year: show.premiered ? show.premiered.substring(0, 4) : "N/A",
            rating: { 
              percentage: show.rating?.average ? Math.round(show.rating.average * 10) : null 
            },
            images: {
              poster: show.image?.original || show.image?.medium,
              fanart: show.image?.original || show.image?.medium
            },
            synopsis: show.summary 
              ? show.summary.replace(/<[^>]*>?/gm, '') 
              : "No description available.",
            genres: show.genres || [],
            runtime: show.averageRuntime,
          };
        });

      const combinedResults = [...formattedMovies, ...formattedSeries];
      console.log(`✅ Fallback search found ${combinedResults.length} results`);
      res.json(combinedResults);
      
    } catch (fallbackError) {
      console.error("❌ Search Fallback Error:", fallbackError.message);
      res.json([]);
    }
    // After fetching TMDB results, also search anime
try {
  const animeResponse = await axios.get(`https://api.jikan.moe/v4/anime`, {
    params: { q: query.trim(), limit: 10, sfw: true }
  });
  
  const animeResults = (animeResponse.data?.data || []).map(anime => ({
    _id: String(anime.mal_id),
    title: anime.title,
    imdb_id: null,
    type: "anime",
    year: anime.aired?.from ? new Date(anime.aired.from).getFullYear() : "N/A",
    rating: {
      percentage: anime.score ? Math.round(anime.score * 10) : null
    },
    images: {
      poster: anime.images?.jpg?.large_image_url,
      fanart: anime.images?.jpg?.large_image_url
    },
    synopsis: anime.synopsis || "No description available.",
    genres: anime.genres?.map(g => g.name) || [],
    runtime: anime.duration || "Unknown"
  }));
  
  // Combine all results
  results = [...results, ...animeResults];
} catch (animeError) {
  console.log("Anime search failed:", animeError.message);
}
  }
});

// ─── GET MOVIE DETAILS ───
router.get('/movie/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📡 Fetching movie details for ID: ${id}`);
    
    const movieDetails = await getMovieDetails(id);
    
    if (!movieDetails) {
      return res.status(404).json({ error: "Movie not found" });
    }
    
    res.json(movieDetails);
  } catch (error) {
    console.error("❌ Movie Details Error:", error.message);
    res.status(500).json({ error: "Failed to fetch movie details" });
  }
});

// ─── GET TV SHOW DETAILS ───
router.get('/tv/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📡 Fetching TV show details for ID: ${id}`);
    
    const tvDetails = await getTVDetails(id);
    
    if (!tvDetails) {
      return res.status(404).json({ error: "TV show not found" });
    }
    
    res.json(tvDetails);
  } catch (error) {
    console.error("❌ TV Details Error:", error.message);
    res.status(500).json({ error: "Failed to fetch TV show details" });
  }
});

// ─── GET MOVIE BY GENRE ───
router.get('/movies/genre/:genreId', async (req, res) => {
  try {
    const { genreId } = req.params;
    console.log(`📡 Fetching movies for genre: ${genreId}`);
    
    const { data } = await axios.get(`https://api.themoviedb.org/3/discover/movie`, {
      params: {
        api_key: process.env.TMDB_KEY,
        with_genres: genreId,
        sort_by: 'popularity.desc',
        language: 'en-US',
        page: 1
      }
    });

    const movies = data.results.map(movie => ({
      _id: String(movie.id),
      title: movie.title,
      imdb_id: null,
      type: "movie",
      year: movie.release_date?.substring(0, 4) || "N/A",
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
    }));

    console.log(`✅ Found ${movies.length} movies for genre ${genreId}`);
    res.json(movies);
  } catch (error) {
    console.error("❌ Genre Movies Error:", error.message);
    res.status(200).json([]);
  }
});

// ─── GET TV SHOWS BY GENRE ───
router.get('/series/genre/:genreId', async (req, res) => {
  try {
    const { genreId } = req.params;
    console.log(`📡 Fetching TV shows for genre: ${genreId}`);
    
    const { data } = await axios.get(`https://api.themoviedb.org/3/discover/tv`, {
      params: {
        api_key: process.env.TMDB_KEY,
        with_genres: genreId,
        sort_by: 'popularity.desc',
        language: 'en-US',
        page: 1
      }
    });

    const shows = data.results.map(show => ({
      _id: String(show.id),
      title: show.name,
      imdb_id: null,
      type: "series",
      year: show.first_air_date?.substring(0, 4) || "N/A",
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
    }));

    console.log(`✅ Found ${shows.length} TV shows for genre ${genreId}`);
    res.json(shows);
  } catch (error) {
    console.error("❌ Genre TV Error:", error.message);
    res.status(200).json([]);
  }
});

// ─── GET TRENDING (Combined) ───
router.get('/trending', async (req, res) => {
  try {
    console.log("📡 Fetching trending content...");
    
    const [movies, shows] = await Promise.all([
      getTrendingMovies(),
      getPopularTVShows()
    ]);

    const trending = {
      movies: movies || [],
      shows: shows || [],
      all: [...(movies || []), ...(shows || [])]
    };

    console.log(`✅ Trending: ${trending.movies.length} movies, ${trending.shows.length} shows`);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json(trending);
  } catch (error) {
    console.error("❌ Trending Error:", error.message);
    res.json({ movies: [], shows: [], all: [] });
  }
});

// ─── GET POPULAR MOVIES (Paginated) ───
router.get('/movies/popular', async (req, res) => {
  try {
    const page = req.query.page || 1;
    console.log(`📡 Fetching popular movies - Page ${page}`);
    
    const { data } = await axios.get(`https://api.themoviedb.org/3/movie/popular`, {
      params: {
        api_key: process.env.TMDB_KEY,
        language: 'en-US',
        page: page
      }
    });

    const movies = data.results.map(movie => ({
      _id: String(movie.id),
      title: movie.title,
      imdb_id: null,
      type: "movie",
      year: movie.release_date?.substring(0, 4) || "N/A",
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
    }));

    console.log(`✅ Fetched ${movies.length} popular movies (Page ${page})`);
    res.json({
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results,
      results: movies
    });
  } catch (error) {
    console.error("❌ Popular Movies Error:", error.message);
    res.status(200).json({ results: [] });
  }
});

// ─── GET TOP RATED MOVIES ───
router.get('/movies/top-rated', async (req, res) => {
  try {
    console.log("📡 Fetching top rated movies...");
    
    const { data } = await axios.get(`https://api.themoviedb.org/3/movie/top_rated`, {
      params: {
        api_key: process.env.TMDB_KEY,
        language: 'en-US',
        page: 1
      }
    });

    const movies = data.results.slice(0, 40).map(movie => ({
      _id: String(movie.id),
      title: movie.title,
      imdb_id: null,
      type: "movie",
      year: movie.release_date?.substring(0, 4) || "N/A",
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
    }));

    console.log(`✅ Fetched ${movies.length} top rated movies`);
    res.json(movies);
  } catch (error) {
    console.error("❌ Top Rated Movies Error:", error.message);
    res.status(200).json([]);
  }
});

export default router;