// services/indexedDbHistory.js
// Stores the last 20 visited or watched items in browser IndexedDB.
// Fully functional for guest users who don't want to log in.

const DB_NAME = "SinStreamsDB";
const DB_VERSION = 1;
const STORE_NAME = "watch_history";
const MAX_HISTORY_ITEMS = 20;
const FALLBACK_KEY = "sinstreams_guest_history";

/**
 * Open or upgrade the IndexedDB database.
 */
function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not supported"));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("visitedAt", "visitedAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Fallback to localStorage if IndexedDB is blocked (e.g. private mode or iframe security).
 */
function fallbackGet() {
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function fallbackSave(items) {
  try {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(items.slice(0, MAX_HISTORY_ITEMS)));
  } catch {
    // Ignore storage quota
  }
}

/**
 * Records a movie, series, or anime into IndexedDB watch history.
 * Caps stored records to the most recent 20 items.
 *
 * @param {object} media - The media object (movie, tv/series, anime)
 * @param {object} [progress] - Context like season, episode, timestamp
 */
export async function recordHistoryItem(media, progress = {}) {
  if (!media) return;

  const rawId = media._id || media.id || media.imdb_id;
  if (!rawId) return;

  const mediaType = media.type === "tv" ? "series" : (media.type || "movie");
  const uniqueId = `${mediaType}_${rawId}`;

  const historyEntry = {
    id: uniqueId,
    mediaId: String(rawId),
    type: mediaType,
    title: media.title || media.name || "Untitled",
    poster: media.images?.poster || media.poster || null,
    backdrop: media.images?.fanart || media.images?.backdrop || media.backdrop || null,
    rating: typeof media.rating === "object"
      ? (media.rating?.percentage ? (media.rating.percentage / 10).toFixed(1) : "—")
      : (media.rating || "—"),
    year: media.year || media.releaseDate?.substring(0, 4) || "—",
    season: progress.season ?? null,
    episode: progress.episode ?? null,
    episodeName: progress.episodeName ?? null,
    visitedAt: Date.now(),
  };

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      store.put(historyEntry);

      tx.oncomplete = async () => {
        // Enforce maximum 20 items by pruning oldest
        try {
          await pruneOldEntries(db);
        } catch (e) {
          console.warn("Could not prune old history entries:", e);
        }
        resolve(historyEntry);
      };

      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    // Graceful fallback to localStorage
    const current = fallbackGet().filter(item => item.id !== uniqueId);
    current.unshift(historyEntry);
    fallbackSave(current);
    return historyEntry;
  }
}

/**
 * Prune entries beyond MAX_HISTORY_ITEMS (20) based on visitedAt.
 */
async function pruneOldEntries(db) {
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("visitedAt");
    const getAllReq = index.getAll();

    getAllReq.onsuccess = () => {
      const all = getAllReq.result || [];
      if (all.length > MAX_HISTORY_ITEMS) {
        // Sort ascending by visitedAt so oldest come first
        all.sort((a, b) => a.visitedAt - b.visitedAt);
        const excess = all.length - MAX_HISTORY_ITEMS;
        for (let i = 0; i < excess; i++) {
          store.delete(all[i].id);
        }
      }
      resolve();
    };

    getAllReq.onerror = () => resolve();
  });
}

/**
 * Retrieve the last 20 history items sorted from newest to oldest.
 * @returns {Promise<Array>} Array of history entries
 */
export async function getWatchHistory() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("visitedAt");
      const getAllReq = index.getAll();

      getAllReq.onsuccess = () => {
        const results = getAllReq.result || [];
        // Sort descending (most recent first)
        results.sort((a, b) => b.visitedAt - a.visitedAt);
        resolve(results.slice(0, MAX_HISTORY_ITEMS));
      };

      getAllReq.onerror = () => {
        resolve(fallbackGet());
      };
    });
  } catch {
    return fallbackGet();
  }
}

/**
 * Remove a specific item from watch history by id.
 * @param {string} id - unique ID (e.g. 'movie_1234')
 */
export async function removeHistoryItem(id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const filtered = fallbackGet().filter(item => item.id !== id);
    fallbackSave(filtered);
    return true;
  }
}

/**
 * Clear all watch history items from IndexedDB.
 */
export async function clearWatchHistory() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    try {
      localStorage.removeItem(FALLBACK_KEY);
    } catch {}
    return true;
  }
}
