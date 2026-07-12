// ─── "Continue Watching" — tracks only the SINGLE most recent thing watched ───
// Deliberately not a history list: every new watch overwrites the last one.

const KEY = "sinstreams_last_watched";

/**
 * Records the most recently watched title.
 * @param {object} media - the media object (movie or series)
 * @param {object} [progress] - optional playback context for series
 * @param {number} [progress.season]
 * @param {number} [progress.episode]
 * @param {string} [progress.episodeName]
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
    // ignore
  }
}