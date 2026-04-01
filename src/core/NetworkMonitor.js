// ============================================
// AuraStream — Network Monitor
// ============================================

import { EventEmitter } from '../utils/helpers.js';
import {
  SPEED_MEASUREMENT_COUNT,
  SPEED_FAST,
  SPEED_MEDIUM,
  SPEED_SLOW,
  CHUNK_SIZE,
  CHUNK_SIZE_MIN,
  CHUNK_SIZE_MAX,
} from '../utils/constants.js';

export class NetworkMonitor extends EventEmitter {
  constructor() {
    super();
    this._measurements = [];
    this._currentSpeed = 0; // bytes per second
    this._quality = 'good'; // good | medium | poor
    this._optimalChunkSize = CHUNK_SIZE;

    // Use navigator.connection if available
    if ('connection' in navigator) {
      const conn = navigator.connection;
      conn.addEventListener('change', () => this._onConnectionChange());
      this._onConnectionChange();
    }
  }

  /**
   * Record a download measurement
   * @param {number} bytes - Bytes downloaded
   * @param {number} durationMs - Time taken in milliseconds
   */
  recordMeasurement(bytes, durationMs) {
    if (durationMs <= 0 || bytes <= 0) return;

    const bytesPerSecond = bytes / (durationMs / 1000);
    this._measurements.push(bytesPerSecond);

    // Keep only last N measurements
    if (this._measurements.length > SPEED_MEASUREMENT_COUNT) {
      this._measurements.shift();
    }

    // Calculate rolling average
    const sum = this._measurements.reduce((a, b) => a + b, 0);
    this._currentSpeed = sum / this._measurements.length;

    // Determine quality tier
    const mbps = (this._currentSpeed * 8) / (1024 * 1024);
    let newQuality;
    if (mbps >= SPEED_FAST) {
      newQuality = 'good';
      this._optimalChunkSize = CHUNK_SIZE_MAX;
    } else if (mbps >= SPEED_MEDIUM) {
      newQuality = 'medium';
      this._optimalChunkSize = CHUNK_SIZE;
    } else {
      newQuality = 'poor';
      this._optimalChunkSize = CHUNK_SIZE_MIN;
    }

    if (newQuality !== this._quality) {
      this._quality = newQuality;
      this.emit('quality-change', { quality: this._quality, mbps });
    }

    this.emit('speed-update', {
      bytesPerSecond: this._currentSpeed,
      mbps,
      quality: this._quality,
    });
  }

  /**
   * Handle navigator.connection changes
   */
  _onConnectionChange() {
    const conn = navigator.connection;
    if (conn && conn.downlink) {
      // downlink is in Mbps
      const bytesPerSecond = (conn.downlink * 1024 * 1024) / 8;
      this.recordMeasurement(bytesPerSecond, 1000);
    }
  }

  /** Current speed in bytes/second */
  get speed() {
    return this._currentSpeed;
  }

  /** Current quality tier */
  get quality() {
    return this._quality;
  }

  /** Optimal chunk size based on network conditions */
  get optimalChunkSize() {
    return this._optimalChunkSize;
  }

  /** Speed in Mbps */
  get mbps() {
    return (this._currentSpeed * 8) / (1024 * 1024);
  }

  destroy() {
    this.removeAllListeners();
  }
}
