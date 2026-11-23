// services/animeService.js
// Provides Anime metadata using AniList GraphQL as primary engine
// with Jikan API v4 (MyAnimeList) as secondary / fallback engine.
import axios from "axios";

const ANILIST_URL = "https://graphql.anilist.co";
const JIKAN_URL = "https://api.jikan.moe/v4";

// Simple in-memory cache to avoid duplicate requests during navigation
const memoryCache = new Map();

function getCached(key) {
  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() - item.time > 10 * 60 * 1000) { // 10 min TTL
    memoryCache.delete(key);
    return null;
  }
  return item.data;
}

function setCache(key, data) {
  memoryCache.set(key, { data, time: Date.now() });
}

// ── Standard GraphQL Media Fragment ──
const MEDIA_FRAGMENT = `
  id
  idMal
  title {
    romaji
    english
    native
    userPreferred
  }
  description(asHtml: false)
  format
  status
  episodes
  duration
  seasonYear
  startDate {
    year
    month
    day
  }
  averageScore
  genres
  bannerImage
  coverImage {
    extraLarge
    large
    medium
    color
  }
  nextAiringEpisode {
    episode
    airingAt
  }
  trailer {
    id
    site
  }
`;

export function resolveEpisodeCount(item) {
  if (!item) return 12;

  // 1. Airing schedule if AniList provides upcoming episode number:
  // (nextAiringEpisode.episode - 1) is dynamically the exact count of released episodes!
  // For One Piece, AniList returns nextAiringEpisode 1181 -> exactly 1180 aired episodes!
  if (item.nextAiringEpisode?.episode && item.nextAiringEpisode.episode > 1) {
    return item.nextAiringEpisode.episode - 1;
  }

  // 2. Official AniList / Jikan broadcast episodes count if specified (e.g. 24, 12, 64, 500, etc.)
  if (typeof item.episodes === 'number' && item.episodes > 0) {
    return item.episodes;
  }

  // 3. Fallback from TMDB number_of_episodes if attached
  if (typeof item.number_of_episodes === 'number' && item.number_of_episodes > 0) {
    return item.number_of_episodes;
  }

  // 4. Default for ongoing seasonal vs finished
  if (item.status === 'RELEASING' || item.status === 'Currently Airing') return 24;
  return 12;
}

/**
 * Normalizes an AniList media item into the SinStreams media schema
 */
export function formatAniListItem(item) {
  if (!item) return null;

  const rawTitle = item.title?.english || item.title?.romaji || item.title?.userPreferred || "Untitled Anime";
  const ratingVal = item.averageScore ? (item.averageScore / 10).toFixed(1) : "—";
  const yearVal = item.seasonYear || item.startDate?.year || "—";
  const posterUrl = item.coverImage?.extraLarge || item.coverImage?.large || item.coverImage?.medium || null;
  const backdropUrl = item.bannerImage || posterUrl;
  const epCount = resolveEpisodeCount(item);

  return {
    _id: String(item.id),
    id: String(item.id),
    mal_id: item.idMal || null,
    anilist_id: item.id,
    title: rawTitle,
    originalTitle: item.title?.native || null,
    type: "anime",
    format: item.format || "TV",
    year: yearVal,
    rating: {
      percentage: item.averageScore || 0,
      votes: null,
      value: ratingVal,
    },
    overview: item.description ? item.description.replace(/<[^>]*>?/gm, "").trim() : "No synopsis available.",
    synopsis: item.description ? item.description.replace(/<[^>]*>?/gm, "").trim() : "No synopsis available.",
    images: {
      poster: posterUrl,
      fanart: backdropUrl,
      backdrop: backdropUrl,
    },
    genres: item.genres || [],
    episodes: epCount,
    duration: item.duration ? `${item.duration}m` : null,
    status: item.status || "FINISHED",
    nextAiringEpisode: item.nextAiringEpisode || null,
    trailerKey: item.trailer?.site === "youtube" ? item.trailer.id : null,
  };
}

/**
 * Normalizes a Jikan media item into the SinStreams media schema
 */
export function formatJikanItem(item) {
  if (!item) return null;

  const rawTitle = item.title_english || item.title || item.title_japanese || "Untitled Anime";
  const ratingVal = item.score ? item.score.toFixed(1) : "—";
  const yearVal = item.year || item.aired?.prop?.from?.year || "—";
  const posterUrl = item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url || null;
  const backdropUrl = item.trailer?.images?.maximum_image_url || posterUrl;
  const epCount = resolveEpisodeCount(item);

  return {
    _id: String(item.mal_id),
    id: String(item.mal_id),
    mal_id: item.mal_id,
    anilist_id: null,
    title: rawTitle,
    originalTitle: item.title_japanese || null,
    type: "anime",
    format: item.type || "TV",
    year: yearVal,
    rating: {
      percentage: item.score ? Math.round(item.score * 10) : 0,
      votes: item.scored_by || null,
      value: ratingVal,
    },
    overview: item.synopsis || "No synopsis available.",
    synopsis: item.synopsis || "No synopsis available.",
    images: {
      poster: posterUrl,
      fanart: backdropUrl,
      backdrop: backdropUrl,
    },
    genres: item.genres?.map(g => g.name) || [],
    episodes: epCount,
    duration: item.duration || null,
    status: item.status || "Finished Airing",
    trailerKey: item.trailer?.youtube_id || null,
  };
}

/**
 * Execute an AniList GraphQL Query
 */
async function queryAniList(query, variables = {}) {
  const { data } = await axios.post(
    ANILIST_URL,
    { query, variables },
    { headers: { "Content-Type": "application/json", Accept: "application/json" } }
  );
  return data?.data;
}

/**
 * Fetch Trending Anime
 */
export async function getTrendingAnime(page = 1, perPage = 20) {
  const cacheKey = `trending_${page}_${perPage}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const query = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
            ${MEDIA_FRAGMENT}
          }
        }
      }
    `;
    const res = await queryAniList(query, { page, perPage });
    const list = (res?.Page?.media || []).map(formatAniListItem);
    setCache(cacheKey, list);
    return list;
  } catch (err) {
    console.warn("AniList trending failed, falling back to Jikan:", err.message);
    try {
      const { data } = await axios.get(`${JIKAN_URL}/top/anime?filter=airing&limit=${perPage}`);
      const list = (data?.data || []).map(formatJikanItem);
      setCache(cacheKey, list);
      return list;
    } catch {
      return [];
    }
  }
}

/**
 * Fetch Popular Anime of All Time
 */
export async function getPopularAnime(page = 1, perPage = 20) {
  const cacheKey = `popular_${page}_${perPage}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const query = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
            ${MEDIA_FRAGMENT}
          }
        }
      }
    `;
    const res = await queryAniList(query, { page, perPage });
    const list = (res?.Page?.media || []).map(formatAniListItem);
    setCache(cacheKey, list);
    return list;
  } catch (err) {
    console.warn("AniList popular failed, falling back to Jikan:", err.message);
    try {
      const { data } = await axios.get(`${JIKAN_URL}/top/anime?filter=bypopularity&limit=${perPage}`);
      const list = (data?.data || []).map(formatJikanItem);
      setCache(cacheKey, list);
      return list;
    } catch {
      return [];
    }
  }
}

/**
 * Fetch Top Rated Anime
 */
export async function getTopRatedAnime(page = 1, perPage = 20) {
  const cacheKey = `top_rated_${page}_${perPage}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const query = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, sort: SCORE_DESC, isAdult: false) {
            ${MEDIA_FRAGMENT}
          }
        }
      }
    `;
    const res = await queryAniList(query, { page, perPage });
    const list = (res?.Page?.media || []).map(formatAniListItem);
    setCache(cacheKey, list);
    return list;
  } catch {
    return [];
  }
}

/**
 * Fetch Anime by Genre (e.g. Action, Romance, Sci-Fi, Fantasy, Supernatural, Comedy)
 */
export async function getAnimeByGenre(genre, page = 1, perPage = 20) {
  const cacheKey = `genre_${genre}_${page}_${perPage}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const query = `
      query ($genre: String, $page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, genre: $genre, sort: POPULARITY_DESC, isAdult: false) {
            ${MEDIA_FRAGMENT}
          }
        }
      }
    `;
    const res = await queryAniList(query, { genre, page, perPage });
    const list = (res?.Page?.media || []).map(formatAniListItem);
    setCache(cacheKey, list);
    return list;
  } catch (err) {
    console.warn(`AniList genre ${genre} failed:`, err.message);
    return [];
  }
}

/**
 * Search Anime by Query
 */
export async function searchAnime(queryText, page = 1, perPage = 20) {
  if (!queryText || !queryText.trim()) return [];

  try {
    const query = `
      query ($search: String, $page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, search: $search, isAdult: false) {
            ${MEDIA_FRAGMENT}
          }
        }
      }
    `;
    const res = await queryAniList(query, { search: queryText, page, perPage });
    return (res?.Page?.media || []).map(formatAniListItem);
  } catch (err) {
    console.warn("AniList search failed, trying Jikan:", err.message);
    try {
      const { data } = await axios.get(`${JIKAN_URL}/anime?q=${encodeURIComponent(queryText)}&limit=${perPage}`);
      return (data?.data || []).map(formatJikanItem);
    } catch {
      return [];
    }
  }
}

/**
 * Fetch Full Details for a Single Anime by AniList ID (or MAL ID fallback)
 */
export async function getAnimeDetails(id) {
  const numericId = parseInt(id, 10);
  const cacheKey = `details_${id}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const query = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          ${MEDIA_FRAGMENT}
          studios(isMain: true) {
            nodes {
              name
            }
          }
          characters(role: MAIN, perPage: 8) {
            nodes {
              name {
                userPreferred
              }
              image {
                medium
              }
            }
          }
          nextAiringEpisode {
            episode
            airingAt
          }
        }
      }
    `;
    const res = await queryAniList(query, { id: numericId });
    if (res?.Media) {
      const formatted = formatAniListItem(res.Media);
      formatted.studios = res.Media.studios?.nodes?.map(s => s.name) || [];
      formatted.characters = res.Media.characters?.nodes?.map(c => ({
        name: c.name?.userPreferred,
        image: c.image?.medium,
      })) || [];
      formatted.nextAiringEpisode = res.Media.nextAiringEpisode || null;
      formatted.episodes = resolveEpisodeCount({ ...formatted, ...res.Media });

      setCache(cacheKey, formatted);
      return formatted;
    }
  } catch (err) {
    console.warn("AniList getAnimeDetails failed, trying Jikan with MAL id or search:", err.message);
  }

  // Fallback to Jikan
  try {
    const { data } = await axios.get(`${JIKAN_URL}/anime/${numericId}/full`);
    if (data?.data) {
      const formatted = formatJikanItem(data.data);
      formatted.episodes = resolveEpisodeCount(formatted);

      setCache(cacheKey, formatted);
      return formatted;
    }
  } catch (err) {
    console.error("All anime detail endpoints failed:", err);
  }

  return null;
}
