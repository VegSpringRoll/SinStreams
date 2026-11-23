// services/Watchhistory.js
// Tracks the single most recent item in localStorage for instant Continue Watching hero card,
// and simultaneously persists to IndexedDB guest watch history (up to 20 items).

import { recordHistoryItem } from "./indexedDbHistory";

const KEY = "sinstreams_last_watched";

/**
 * Records the most recently watched title.
 * @param {object} media - the media object (movie, series, or anime)
 * @param {object} [progress] - optional playback context
 */
export function saveLastWatched(media, progress = {}) {
  if (!media) return;
  try {
    const entry = {
      media,
      season: progress.season ?? null,
      episode: progress.episode ?? null,
      episodeName: progress.episodeName ?? null,
      watchedAt: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(entry));

    // Also persist into IndexedDB for the 20-item guest watch history
    recordHistoryItem(media, progress).catch(err => {
      console.warn("Could not save to IndexedDB history:", err);
    });
  } catch (err) {
    console.warn("Could not save last watched:", err.message);
  }
}

/** Returns the last-watched entry, or null if none / storage unavailable. */
export function getLastWatched() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.media) return null;
    return parsed;
  } catch (err) {
    return null;
  }
}

/** Clears the last-watched entry (e.g. user dismisses the Continue Watching card). */
export function clearLastWatched() {
  try {
    localStorage.removeItem(KEY);
  } catch (err) {
  }
}
