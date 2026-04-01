// ============================================
// AuraStream — Utility Helpers
// ============================================

/**
 * Format seconds into HH:MM:SS or MM:SS
 */
export function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Format bytes into human-readable size
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Format speed in Mbps
 */
export function formatSpeed(bytesPerSecond) {
  const mbps = (bytesPerSecond * 8) / (1024 * 1024);
  if (mbps >= 1) return `${mbps.toFixed(1)} Mbps`;
  const kbps = (bytesPerSecond * 8) / 1024;
  return `${kbps.toFixed(0)} Kbps`;
}

/**
 * Debounce a function
 */
export function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle a function
 */
export function throttle(fn, delay) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      fn.apply(this, args);
    }
  };
}

/**
 * Create an element with optional classes and attributes
 */
export function createElement(tag, { className, id, attrs, html, text, children } = {}) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (id) el.id = id;
  if (attrs) {
    for (const [key, val] of Object.entries(attrs)) {
      el.setAttribute(key, val);
    }
  }
  if (html) el.innerHTML = html;
  else if (text) el.textContent = text;
  if (children) {
    children.forEach(child => {
      if (child) el.appendChild(child);
    });
  }
  return el;
}

/**
 * Simple event emitter mixin
 */
export class EventEmitter {
  constructor() {
    this._listeners = {};
  }

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(f => f !== fn);
  }

  emit(event, ...args) {
    if (this._listeners[event]) {
      this._listeners[event].forEach(fn => fn(...args));
    }
  }

  removeAllListeners() {
    this._listeners = {};
  }
}

/**
 * Clamp value between min and max
 */
export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/**
 * Extract filename from URL
 */
export function getFilenameFromUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname;
    const name = path.split('/').pop();
    return name || u.hostname;
  } catch {
    return url.substring(0, 50);
  }
}

/**
 * Generate a unique ID
 */
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
