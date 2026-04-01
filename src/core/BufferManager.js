// ============================================
// AuraStream — Buffer Manager
// ============================================

import { EventEmitter } from '../utils/helpers.js';
import { BUFFER_AHEAD_SECONDS, BUFFER_BEHIND_SECONDS } from '../utils/constants.js';

export class BufferManager extends EventEmitter {
  /**
   * @param {HTMLVideoElement} video
   * @param {MediaSource} [mediaSource]
   * @param {SourceBuffer} [sourceBuffer]
   */
  constructor(video, mediaSource = null, sourceBuffer = null) {
    super();
    this._video = video;
    this._mediaSource = mediaSource;
    this._sourceBuffer = sourceBuffer;
    this._fetchedRanges = []; // [{ start, end }] byte ranges already fetched
    this._isEvicting = false;
    this._monitorInterval = null;
  }

  /**
   * Start monitoring buffer health
   */
  startMonitoring() {
    this._monitorInterval = setInterval(() => {
      this._checkBufferHealth();
      this._evictOldBuffer();
    }, 2000);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this._monitorInterval) {
      clearInterval(this._monitorInterval);
      this._monitorInterval = null;
    }
  }

  /**
   * Get the buffered time ahead of current position
   */
  getBufferAhead() {
    const video = this._video;
    if (!video || !video.buffered.length) return 0;

    const current = video.currentTime;
    for (let i = 0; i < video.buffered.length; i++) {
      const start = video.buffered.start(i);
      const end = video.buffered.end(i);
      if (current >= start && current <= end) {
        return end - current;
      }
    }
    return 0;
  }

  /**
   * Get the buffered time behind current position
   */
  getBufferBehind() {
    const video = this._video;
    if (!video || !video.buffered.length) return 0;

    const current = video.currentTime;
    for (let i = 0; i < video.buffered.length; i++) {
      const start = video.buffered.start(i);
      const end = video.buffered.end(i);
      if (current >= start && current <= end) {
        return current - start;
      }
    }
    return 0;
  }

  /**
   * Get total buffered duration
   */
  getTotalBuffered() {
    const video = this._video;
    if (!video || !video.buffered.length) return 0;

    let total = 0;
    for (let i = 0; i < video.buffered.length; i++) {
      total += video.buffered.end(i) - video.buffered.start(i);
    }
    return total;
  }

  /**
   * Check if a time position is currently buffered
   */
  isTimeBuffered(time) {
    const video = this._video;
    if (!video || !video.buffered.length) return false;

    for (let i = 0; i < video.buffered.length; i++) {
      if (time >= video.buffered.start(i) && time <= video.buffered.end(i)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if we need more buffer ahead
   */
  needsMoreBuffer() {
    return this.getBufferAhead() < BUFFER_AHEAD_SECONDS;
  }

  /**
   * Record a fetched byte range to avoid re-fetching
   */
  recordFetchedRange(startByte, endByte) {
    this._fetchedRanges.push({ start: startByte, end: endByte });
    // Merge overlapping/adjacent ranges
    this._fetchedRanges.sort((a, b) => a.start - b.start);
    const merged = [this._fetchedRanges[0]];
    for (let i = 1; i < this._fetchedRanges.length; i++) {
      const last = merged[merged.length - 1];
      const curr = this._fetchedRanges[i];
      if (curr.start <= last.end + 1) {
        last.end = Math.max(last.end, curr.end);
      } else {
        merged.push(curr);
      }
    }
    this._fetchedRanges = merged;
  }

  /**
   * Check if a byte range has already been fetched
   */
  isRangeFetched(startByte, endByte) {
    for (const range of this._fetchedRanges) {
      if (startByte >= range.start && endByte <= range.end) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check buffer health and emit status
   */
  _checkBufferHealth() {
    const ahead = this.getBufferAhead();
    let status;
    if (ahead >= 15) {
      status = 'healthy';
    } else if (ahead >= 5) {
      status = 'warning';
    } else {
      status = 'critical';
    }

    this.emit('buffer-health', {
      status,
      ahead,
      behind: this.getBufferBehind(),
      total: this.getTotalBuffered(),
    });
  }

  /**
   * Evict buffer content that's too far behind playback position
   */
  async _evictOldBuffer() {
    if (!this._sourceBuffer || this._isEvicting) return;
    if (this._sourceBuffer.updating) return;

    const video = this._video;
    if (!video || !video.buffered.length) return;

    const current = video.currentTime;
    const behind = this.getBufferBehind();

    // Only evict if we have more than BUFFER_BEHIND_SECONDS behind
    if (behind <= BUFFER_BEHIND_SECONDS) return;

    const evictEnd = current - BUFFER_BEHIND_SECONDS;
    if (evictEnd <= 0) return;

    // Check that there's actually data before evictEnd
    const bufStart = video.buffered.start(0);
    if (bufStart >= evictEnd) return;

    this._isEvicting = true;

    try {
      await new Promise((resolve, reject) => {
        const onUpdateEnd = () => {
          this._sourceBuffer.removeEventListener('updateend', onUpdateEnd);
          this._sourceBuffer.removeEventListener('error', onError);
          resolve();
        };
        const onError = (e) => {
          this._sourceBuffer.removeEventListener('updateend', onUpdateEnd);
          this._sourceBuffer.removeEventListener('error', onError);
          reject(e);
        };
        this._sourceBuffer.addEventListener('updateend', onUpdateEnd);
        this._sourceBuffer.addEventListener('error', onError);
        this._sourceBuffer.remove(bufStart, evictEnd);
      });

      this.emit('buffer-evicted', { from: bufStart, to: evictEnd });
    } catch (err) {
      console.warn('[BufferManager] Eviction failed:', err);
    } finally {
      this._isEvicting = false;
    }
  }

  /**
   * Get all buffered ranges as array of {start, end}
   */
  getBufferedRanges() {
    const video = this._video;
    if (!video || !video.buffered.length) return [];

    const ranges = [];
    for (let i = 0; i < video.buffered.length; i++) {
      ranges.push({
        start: video.buffered.start(i),
        end: video.buffered.end(i),
      });
    }
    return ranges;
  }

  destroy() {
    this.stopMonitoring();
    this._fetchedRanges = [];
    this.removeAllListeners();
  }
}
