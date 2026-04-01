// ============================================
// AuraStream — LocalStorage Helpers
// ============================================

import { HISTORY_MAX_ITEMS } from './constants.js';

const STORAGE_PREFIX = 'aurastream_';

/**
 * Get a value from localStorage
 */
export function getStorage(key, fallback = null) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Set a value in localStorage
 */
export function setStorage(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or blocked — ignore
  }
}

/**
 * Remove a key from localStorage
 */
export function removeStorage(key) {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    // Ignore
  }
}

/**
 * Get streaming history
 */
export function getHistory() {
  return getStorage('history', []);
}

/**
 * Add a URL to streaming history
 */
export function addToHistory(url) {
  const history = getHistory();
  // Remove duplicate if exists
  const filtered = history.filter(item => item.url !== url);
  // Add to front
  filtered.unshift({
    url,
    timestamp: Date.now(),
  });
  // Limit size
  const trimmed = filtered.slice(0, HISTORY_MAX_ITEMS);
  setStorage('history', trimmed);
  return trimmed;
}

/**
 * Clear streaming history
 */
export function clearHistory() {
  removeStorage('history');
}

/**
 * Get/set volume preference
 */
export function getSavedVolume() {
  return getStorage('volume', 1);
}

export function saveVolume(vol) {
  setStorage('volume', vol);
}

/**
 * Get/set playback speed preference
 */
export function getSavedSpeed() {
  return getStorage('speed', 1);
}

export function saveSpeed(speed) {
  setStorage('speed', speed);
}
