// ============================================
// AuraStream — Streaming Engine
// ============================================

import { EventEmitter } from '../utils/helpers.js';
import { NetworkMonitor } from './NetworkMonitor.js';
import { BufferManager } from './BufferManager.js';
import { probeUrl } from './URLValidator.js';
import {
  CHUNK_SIZE,
  MIN_BUFFER_BEFORE_PLAY,
  PROXY_BASE,
  BUFFER_AHEAD_SECONDS,
} from '../utils/constants.js';

/**
 * StreamingEngine — orchestrates chunk-based video streaming
 * 
 * Modes:
 *  - MSE mode: Uses MediaSource Extensions for fine-grained buffer control
 *  - Native mode: Falls back to native <video> src with proxy URL
 */
export class StreamingEngine extends EventEmitter {
  /**
   * @param {HTMLVideoElement} video
   */
  constructor(video) {
    super();
    this._video = video;
    this._url = null;
    this._proxyUrl = null;
    this._mode = null; // 'mse' | 'native'

    // MSE objects
    this._mediaSource = null;
    this._sourceBuffer = null;

    // Metadata
    this._contentLength = 0;
    this._contentType = '';
    this._acceptRanges = false;

    // Chunk state
    this._currentOffset = 0;
    this._isFetching = false;
    this._isDestroyed = false;
    this._fetchController = null;
    this._appendQueue = [];
    this._isAppending = false;
    this._onSeeking = null;

    // Sub-modules
    this.network = new NetworkMonitor();
    this.buffer = null; // Created after mode is determined

    // Playback monitoring
    this._bufferCheckInterval = null;
  }

  /**
   * Initialize streaming for a URL
   * @param {string} url
   */
  async initialize(url) {
    this._url = url;
    this._proxyUrl = `${PROXY_BASE}?url=${encodeURIComponent(url)}`;

    this.emit('state', 'probing');

    // 1. Probe the URL
    const probe = await probeUrl(url);
    if (!probe.ok) {
      this.emit('error', probe.error);
      return false;
    }

    this._contentLength = probe.contentLength;
    this._contentType = probe.contentType;
    this._acceptRanges = probe.acceptRanges;

    this.emit('metadata', {
      contentType: this._contentType,
      contentLength: this._contentLength,
      acceptRanges: this._acceptRanges,
    });

    // 2. Decide mode
    if (this._acceptRanges && this._contentLength > 0 && this._canUseMSE()) {
      return this._initMSE();
    } else {
      return this._initNative();
    }
  }

  /**
   * Check if MSE can be used for this content type
   */
  _canUseMSE() {
    if (typeof MediaSource === 'undefined') return false;

    // We need fragmented MP4 or WebM for MSE to work properly.
    // Regular MP4 files aren't guaranteed to work with MSE because
    // they may not be fragmented. We'll try MSE first and fall back gracefully.
    const type = this._contentType.toLowerCase();
    if (type.includes('video/mp4') || type.includes('video/webm')) {
      // Check codec support
      const mimeToTest = type.includes('mp4')
        ? 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'
        : 'video/webm; codecs="vp8, vorbis"';
      return MediaSource.isTypeSupported(mimeToTest);
    }
    return false;
  }

  /**
   * Initialize MSE-based streaming
   */
  async _initMSE() {
    this._mode = 'mse';
    this.emit('state', 'initializing-mse');

    try {
      this._mediaSource = new MediaSource();
      const objectUrl = URL.createObjectURL(this._mediaSource);
      this._video.src = objectUrl;

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('MediaSource open timeout')), 10000);
        this._mediaSource.addEventListener('sourceopen', () => {
          clearTimeout(timeout);
          resolve();
        }, { once: true });
        this._mediaSource.addEventListener('error', (e) => {
          clearTimeout(timeout);
          reject(e);
        }, { once: true });
      });

      // Determine MIME type for source buffer
      const mime = this._contentType.includes('webm')
        ? 'video/webm; codecs="vp8, vorbis"'
        : 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';

      this._sourceBuffer = this._mediaSource.addSourceBuffer(mime);
      this._sourceBuffer.mode = 'segments';

      // Configure source buffer events
      this._sourceBuffer.addEventListener('error', (e) => {
        console.error('[StreamingEngine] SourceBuffer error:', e);
        // Fall back to native mode
        this._fallbackToNative();
      });

      // Initialize buffer manager with MSE
      this.buffer = new BufferManager(this._video, this._mediaSource, this._sourceBuffer);
      this.buffer.startMonitoring();

      // Forward buffer events
      this.buffer.on('buffer-health', (data) => this.emit('buffer-health', data));
      this.buffer.on('buffer-evicted', (data) => this.emit('buffer-evicted', data));

      // Listen for all seek operations (seek bar, buttons, hotkeys)
      this._onSeeking = () => {
        this.handleSeek(this._video.currentTime);
      };
      this._video.addEventListener('seeking', this._onSeeking);

      // Start fetching chunks
      this._currentOffset = 0;
      this.emit('state', 'buffering');
      await this._fetchNextChunks();

      return true;
    } catch (err) {
      console.warn('[StreamingEngine] MSE init failed, falling back to native:', err.message);
      return this._fallbackToNative();
    }
  }

  /**
   * Initialize native video playback
   */
  _initNative() {
    this._mode = 'native';
    this.emit('state', 'initializing-native');

    // In native mode, we set the proxy URL directly as src
    // The browser handles Range requests natively
    this._video.src = this._proxyUrl;
    this._video.preload = 'auto';

    // Create buffer manager without MSE (monitoring only)
    this.buffer = new BufferManager(this._video);
    this.buffer.startMonitoring();
    this.buffer.on('buffer-health', (data) => this.emit('buffer-health', data));

    // Listen for loadedmetadata
    this._video.addEventListener('loadedmetadata', () => {
      this.emit('state', 'ready');
      this.emit('duration', this._video.duration);
    }, { once: true });

    // Listen for canplay
    this._video.addEventListener('canplay', () => {
      this.emit('state', 'ready');
    }, { once: true });

    this._video.addEventListener('error', () => {
      const err = this._video.error;
      let msg = 'Failed to load video';
      if (err) {
        switch (err.code) {
          case 1: msg = 'Video loading was aborted'; break;
          case 2: msg = 'Network error while loading video'; break;
          case 3: msg = 'Video format not supported or file is corrupted'; break;
          case 4: msg = 'Video source not found or format not supported'; break;
        }
      }
      this.emit('error', msg);
    });

    // Monitor buffering in native mode
    this._video.addEventListener('waiting', () => {
      this.emit('state', 'buffering');
    });

    this._video.addEventListener('playing', () => {
      this.emit('state', 'playing');
    });

    this.emit('state', 'loading');
    this._video.load();
    return true;
  }

  /**
   * Fallback from MSE to native mode
   */
  _fallbackToNative() {
    // Cleanup MSE
    if (this._onSeeking) {
      this._video.removeEventListener('seeking', this._onSeeking);
      this._onSeeking = null;
    }

    if (this._mediaSource) {
      try {
        if (this._mediaSource.readyState === 'open') {
          this._mediaSource.endOfStream();
        }
      } catch { /* ignore */ }
      this._mediaSource = null;
    }
    this._sourceBuffer = null;
    if (this.buffer) {
      this.buffer.destroy();
      this.buffer = null;
    }

    return this._initNative();
  }

  /**
   * Fetch next chunks until buffer is full
   */
  async _fetchNextChunks() {
    if (this._isDestroyed || this._isFetching) return;
    if (this._mode !== 'mse') return;

    // Check if we've fetched everything
    if (this._contentLength > 0 && this._currentOffset >= this._contentLength) {
      if (this._mediaSource && this._mediaSource.readyState === 'open') {
        // Wait for any pending appends
        await this._waitForAppend();
        try {
          this._mediaSource.endOfStream();
        } catch { /* ignore */ }
      }
      this.emit('state', 'complete');
      return;
    }

    // Check if buffer is already full enough
    if (this.buffer && !this.buffer.needsMoreBuffer() && this._currentOffset > 0) {
      // Schedule re-check later
      this._scheduleBufferCheck();
      return;
    }

    this._isFetching = true;
    const chunkSize = this.network.optimalChunkSize;
    const start = this._currentOffset;
    const end = this._contentLength > 0
      ? Math.min(start + chunkSize - 1, this._contentLength - 1)
      : start + chunkSize - 1;

    // Skip if already fetched
    if (this.buffer && this.buffer.isRangeFetched(start, end)) {
      this._currentOffset = end + 1;
      this._isFetching = false;
      this._fetchNextChunks();
      return;
    }

    try {
      this._fetchController = new AbortController();
      const fetchStart = performance.now();

      const response = await fetch(this._proxyUrl, {
        headers: { Range: `bytes=${start}-${end}` },
        signal: this._fetchController.signal,
      });

      if (!response.ok && response.status !== 206) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.arrayBuffer();
      const fetchEnd = performance.now();

      // Record network measurement
      this.network.recordMeasurement(data.byteLength, fetchEnd - fetchStart);

      // Record fetched range
      if (this.buffer) {
        this.buffer.recordFetchedRange(start, start + data.byteLength - 1);
      }

      // Append to source buffer
      await this._appendToSourceBuffer(data);

      this._currentOffset = start + data.byteLength;
      this._isFetching = false;

      // Emit chunk loaded event
      this.emit('chunk-loaded', {
        offset: start,
        size: data.byteLength,
        total: this._contentLength,
        progress: this._contentLength > 0 ? this._currentOffset / this._contentLength : 0,
      });

      // Check if we have enough to start playing
      const bufferAhead = this.buffer ? this.buffer.getBufferAhead() : 0;
      if (bufferAhead >= MIN_BUFFER_BEFORE_PLAY) {
        this.emit('state', 'ready');
      }

      // Emit duration when available
      if (this._video.duration && isFinite(this._video.duration)) {
        this.emit('duration', this._video.duration);
      }

      // Continue fetching if buffer needs more
      if (this.buffer && this.buffer.needsMoreBuffer()) {
        await this._fetchNextChunks();
      } else {
        this._scheduleBufferCheck();
      }
    } catch (err) {
      this._isFetching = false;
      if (err.name === 'AbortError') return;

      console.error('[StreamingEngine] Fetch error:', err);

      // If this is the first chunk, try native fallback
      if (this._currentOffset === 0) {
        this._fallbackToNative();
      } else {
        // Retry after delay
        setTimeout(() => this._fetchNextChunks(), 2000);
        this.emit('state', 'buffering');
      }
    }
  }

  /**
   * Append data to the source buffer
   */
  async _appendToSourceBuffer(data) {
    if (!this._sourceBuffer || this._isDestroyed) return;

    return new Promise((resolve, reject) => {
      if (this._sourceBuffer.updating) {
        // Queue it
        this._appendQueue.push({ data, resolve, reject });
        return;
      }

      const onUpdateEnd = () => {
        this._sourceBuffer.removeEventListener('updateend', onUpdateEnd);
        this._sourceBuffer.removeEventListener('error', onError);
        this._processAppendQueue();
        resolve();
      };

      const onError = (e) => {
        this._sourceBuffer.removeEventListener('updateend', onUpdateEnd);
        this._sourceBuffer.removeEventListener('error', onError);
        reject(e);
      };

      this._sourceBuffer.addEventListener('updateend', onUpdateEnd);
      this._sourceBuffer.addEventListener('error', onError);

      try {
        this._sourceBuffer.appendBuffer(data);
      } catch (e) {
        this._sourceBuffer.removeEventListener('updateend', onUpdateEnd);
        this._sourceBuffer.removeEventListener('error', onError);
        reject(e);
      }
    });
  }

  /**
   * Process queued appends
   */
  async _processAppendQueue() {
    if (this._appendQueue.length === 0 || this._sourceBuffer.updating) return;

    const { data, resolve, reject } = this._appendQueue.shift();

    const onUpdateEnd = () => {
      this._sourceBuffer.removeEventListener('updateend', onUpdateEnd);
      this._sourceBuffer.removeEventListener('error', onError);
      resolve();
      this._processAppendQueue();
    };

    const onError = (e) => {
      this._sourceBuffer.removeEventListener('updateend', onUpdateEnd);
      this._sourceBuffer.removeEventListener('error', onError);
      reject(e);
    };

    this._sourceBuffer.addEventListener('updateend', onUpdateEnd);
    this._sourceBuffer.addEventListener('error', onError);

    try {
      this._sourceBuffer.appendBuffer(data);
    } catch (e) {
      this._sourceBuffer.removeEventListener('updateend', onUpdateEnd);
      this._sourceBuffer.removeEventListener('error', onError);
      reject(e);
    }
  }

  /**
   * Wait for any pending source buffer operation
   */
  _waitForAppend() {
    if (!this._sourceBuffer || !this._sourceBuffer.updating) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this._sourceBuffer.addEventListener('updateend', resolve, { once: true });
    });
  }

  /**
   * Schedule periodic buffer level check
   */
  _scheduleBufferCheck() {
    if (this._bufferCheckInterval) return;

    this._bufferCheckInterval = setInterval(() => {
      if (this._isDestroyed) {
        clearInterval(this._bufferCheckInterval);
        this._bufferCheckInterval = null;
        return;
      }

      if (this.buffer && this.buffer.needsMoreBuffer()) {
        clearInterval(this._bufferCheckInterval);
        this._bufferCheckInterval = null;
        this._fetchNextChunks();
      }
    }, 1000);
  }

  /**
   * Handle seek — refill buffer if needed
   */
  handleSeek(time) {
    if (this._mode !== 'mse') return; // Native mode handles seeking internally

    if (this.buffer && !this.buffer.isTimeBuffered(time)) {
      // Need to fetch new data for this position
      // Calculate approximate byte offset
      if (this._video.duration && this._contentLength) {
        const ratio = time / this._video.duration;
        const byteOffset = Math.floor(ratio * this._contentLength);
        this._currentOffset = byteOffset;
        this._abortCurrentFetch();
        this._fetchNextChunks();
      }
    }
  }

  /**
   * Abort current fetch operation
   */
  _abortCurrentFetch() {
    if (this._fetchController) {
      this._fetchController.abort();
      this._fetchController = null;
    }
    this._isFetching = false;
  }

  /**
   * Get current streaming stats
   */
  getStats() {
    return {
      mode: this._mode,
      contentLength: this._contentLength,
      currentOffset: this._currentOffset,
      progress: this._contentLength > 0 ? this._currentOffset / this._contentLength : 0,
      networkSpeed: this.network.speed,
      networkQuality: this.network.quality,
      bufferAhead: this.buffer ? this.buffer.getBufferAhead() : 0,
      bufferBehind: this.buffer ? this.buffer.getBufferBehind() : 0,
    };
  }

  /**
   * Destroy and cleanup
   */
  destroy() {
    this._isDestroyed = true;
    this._abortCurrentFetch();

    if (this._onSeeking) {
      this._video.removeEventListener('seeking', this._onSeeking);
      this._onSeeking = null;
    }

    if (this._bufferCheckInterval) {
      clearInterval(this._bufferCheckInterval);
    }

    if (this.buffer) {
      this.buffer.destroy();
    }

    if (this.network) {
      this.network.destroy();
    }

    if (this._mediaSource && this._mediaSource.readyState === 'open') {
      try {
        this._mediaSource.endOfStream();
      } catch { /* ignore */ }
    }

    this._mediaSource = null;
    this._sourceBuffer = null;
    this._appendQueue = [];
    this.removeAllListeners();
  }
}
