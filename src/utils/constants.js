// ============================================
// AuraStream — Constants
// ============================================

export const APP_NAME = 'AuraStream';

// Streaming
export const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
export const CHUNK_SIZE_MIN = 256 * 1024; // 256KB for slow networks
export const CHUNK_SIZE_MAX = 2 * 1024 * 1024; // 2MB for fast networks
export const BUFFER_AHEAD_SECONDS = 30; // Preload 30 seconds ahead
export const BUFFER_BEHIND_SECONDS = 300; // Keep 5 minutes behind
export const MIN_BUFFER_BEFORE_PLAY = 2; // Start playing after 2 seconds buffered

// Network speed thresholds (Mbps)
export const SPEED_FAST = 5;
export const SPEED_MEDIUM = 2;
export const SPEED_SLOW = 0.5;
export const SPEED_MEASUREMENT_COUNT = 5; // Rolling average window

// Player
export const CONTROLS_HIDE_DELAY = 3000; // 3 seconds
export const SEEK_STEP = 10; // 10 seconds
export const VOLUME_STEP = 0.05; // 5%
export const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
export const DEFAULT_SPEED = 1;

// UI
export const TOAST_DURATION = 4000;
export const HISTORY_MAX_ITEMS = 10;
export const MAX_URL_LENGTH = 2048;

// Proxy
export const PROXY_BASE = import.meta.env.VITE_PROXY_URL || '/api/proxy';

// MIME types
export const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/x-matroska',
];

export const MSE_MIME_TYPES = {
  mp4: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
  webm: 'video/webm; codecs="vp8, vorbis"',
  webmVp9: 'video/webm; codecs="vp9, opus"',
};

// Keyboard shortcuts
export const SHORTCUTS = {
  PLAY_PAUSE: [' ', 'k'],
  MUTE: ['m'],
  FULLSCREEN: ['f'],
  FORWARD: ['ArrowRight'],
  BACKWARD: ['ArrowLeft'],
  VOLUME_UP: ['ArrowUp'],
  VOLUME_DOWN: ['ArrowDown'],
  SPEED_UP: ['>'],
  SPEED_DOWN: ['<'],
};
