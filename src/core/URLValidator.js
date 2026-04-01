// ============================================
// AuraStream — URL Validator
// ============================================

import { MAX_URL_LENGTH } from '../utils/constants.js';

// Private/reserved IP ranges to block
const PRIVATE_IP_PATTERNS = [
  /^https?:\/\/localhost/i,
  /^https?:\/\/127\./,
  /^https?:\/\/10\./,
  /^https?:\/\/172\.(1[6-9]|2\d|3[01])\./,
  /^https?:\/\/192\.168\./,
  /^https?:\/\/0\./,
  /^https?:\/\/\[::1\]/,
  /^https?:\/\/\[fc/i,
  /^https?:\/\/\[fd/i,
  /^https?:\/\/169\.254\./,
];

// Common video extensions
const VIDEO_EXTENSIONS = [
  '.mp4', '.webm', '.ogg', '.ogv', '.mkv', '.avi', '.mov', '.m4v', '.ts',
];

/**
 * Validate a video URL
 * @param {string} url
 * @returns {{ valid: boolean, url?: string, error?: string }}
 */
export function validateUrl(url) {
  // Trim whitespace
  const trimmed = (url || '').trim();

  if (!trimmed) {
    return { valid: false, error: 'Please enter a video URL' };
  }

  if (trimmed.length > MAX_URL_LENGTH) {
    return { valid: false, error: 'URL is too long (max 2048 characters)' };
  }

  // Must be HTTP or HTTPS
  if (!/^https?:\/\//i.test(trimmed)) {
    return { valid: false, error: 'URL must start with http:// or https://' };
  }

  // Try to parse
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Block private IPs (for security — prevents SSRF via the proxy)
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { valid: false, error: 'Private/local URLs are not allowed' };
    }
  }

  // Must have a hostname
  if (!parsed.hostname || parsed.hostname.length < 2) {
    return { valid: false, error: 'URL must have a valid hostname' };
  }

  return { valid: true, url: trimmed };
}

/**
 * Check if the URL points to a likely video file
 */
export function isLikelyVideoUrl(url) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    return VIDEO_EXTENSIONS.some(ext => path.endsWith(ext));
  } catch {
    return false;
  }
}

/**
 * Probe a URL via the proxy to check if it's valid and get metadata
 * @param {string} url
 * @returns {Promise<{ ok: boolean, contentType?: string, contentLength?: number, acceptRanges?: boolean, error?: string }>}
 */
export async function probeUrl(url) {
  try {
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { ok: false, error: 'Video not found (404)' };
      }
      if (response.status === 403) {
        return { ok: false, error: 'Access denied (403). The video may be private.' };
      }
      return { ok: false, error: `Server returned ${response.status}` };
    }

    const contentType = response.headers.get('content-type') || '';
    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
    const acceptRanges = (response.headers.get('accept-ranges') || '').toLowerCase() === 'bytes';

    return {
      ok: true,
      contentType,
      contentLength: contentLength || 0,
      acceptRanges,
    };
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return { ok: false, error: 'Connection timed out. The server may be slow or unreachable.' };
    }
    return { ok: false, error: 'Could not reach the video. Check the URL and try again.' };
  }
}
