// AuraStream — Video Player Component

import { createElement } from '../utils/helpers.js';
import { StreamingEngine } from '../core/StreamingEngine.js';
import { Controls } from './Controls.js';
import { BufferIndicator } from './BufferIndicator.js';

export class VideoPlayer {
  /**
   * @param {string} url - Video URL to stream
   * @param {function} onBack - Callback to go back to landing
   */
  constructor(url, onBack) {
    this._url = url;
    this._onBack = onBack;
    this._element = null;
    this._video = null;
    this._engine = null;
    this._controls = null;
    this._bufferIndicator = null;
    this._loadingOverlay = null;
    this._bigPlayBtn = null;
    this._errorOverlay = null;
    this._animFrameId = null;

    this._element = this._create();
    this._init();
  }

  _create() {
    // Video element
    this._video = createElement('video', {
      className: 'player-video',
      id: 'aura-video',
      attrs: { playsinline: '', preload: 'auto' },
    });

    // Loading overlay with spinner
    this._loadingOverlay = createElement('div', {
      className: 'player-loading-overlay visible',
      id: 'aura-loading',
      html: `
        <svg class="loading-spinner" viewBox="0 0 50 50">
          <defs>
            <linearGradient id="spinner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#7c3aed"/>
              <stop offset="50%" style="stop-color:#06b6d4"/>
              <stop offset="100%" style="stop-color:#ec4899"/>
            </linearGradient>
          </defs>
          <circle cx="25" cy="25" r="20"/>
        </svg>
        <span class="loading-text">Connecting to stream...</span>
      `,
    });

    // Big play button (shown when paused)
    this._bigPlayBtn = createElement('div', {
      className: 'player-big-play',
      id: 'aura-big-play',
      html: `
        <button class="player-big-play-btn" aria-label="Play">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21"/>
          </svg>
        </button>
      `,
    });

    // Error overlay
    this._errorOverlay = createElement('div', {
      className: 'player-error-overlay',
      id: 'aura-error-overlay',
      html: `
        <div class="error-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <div class="error-title">Playback Error</div>
        <div class="error-message">Something went wrong.</div>
        <button class="error-retry-btn">Try Again</button>
      `,
    });
    this._errorOverlay.style.display = 'none';

    // Buffer & Network indicators
    this._bufferIndicator = new BufferIndicator();

    // Video container
    const videoContainer = createElement('div', {
      className: 'player-video-container',
      id: 'aura-video-container',
      children: [
        this._video,
        this._loadingOverlay,
        this._bigPlayBtn,
        this._errorOverlay,
        this._bufferIndicator.bufferElement,
        this._bufferIndicator.networkElement,
      ],
    });

    // Create controls (needs wrapper reference)
    const wrapper = createElement('div', {
      className: 'player-wrapper',
      id: 'aura-player-wrapper',
    });

    this._controls = new Controls(this._video, wrapper);

    videoContainer.appendChild(this._controls.element);
    wrapper.appendChild(videoContainer);

    // Back button & URL display
    const backBtn = createElement('button', {
      className: 'player-back-btn',
      id: 'aura-back-btn',
      html: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"/>
          <polyline points="12 19 5 12 12 5"/>
        </svg>
        Back
      `,
    });
    backBtn.addEventListener('click', () => {
      this.destroy();
      if (this._onBack) this._onBack();
    });

    const urlDisplay = createElement('div', {
      className: 'player-url-display',
      id: 'aura-url-display',
      text: this._url,
    });

    const playerInfo = createElement('div', {
      className: 'player-info',
      children: [backBtn, urlDisplay],
    });

    // Page container
    const page = createElement('div', {
      className: 'player-page',
      children: [playerInfo, wrapper],
    });

    return page;
  }

  async _init() {
    // Set up video events
    this._video.addEventListener('click', () => {
      this._controls.togglePlay();
    });

    this._bigPlayBtn.addEventListener('click', () => {
      this._controls.togglePlay();
    });

    this._video.addEventListener('play', () => {
      this._bigPlayBtn.classList.remove('visible');
    });

    this._video.addEventListener('pause', () => {
      if (!this._video.ended) {
        this._bigPlayBtn.classList.add('visible');
      }
    });

    this._video.addEventListener('ended', () => {
      this._bigPlayBtn.classList.add('visible');
    });

    // Error retry
    this._errorOverlay.querySelector('.error-retry-btn').addEventListener('click', () => {
      this._errorOverlay.style.display = 'none';
      this._loadingOverlay.classList.add('visible');
      this._startStreaming();
    });

    // Start animation frame loop for seek bar
    this._startAnimLoop();

    // Start streaming
    await this._startStreaming();
  }

  async _startStreaming() {
    this._engine = new StreamingEngine(this._video);

    // Listen for engine events
    this._engine.on('state', (state) => {
      this._updateLoadingText(state);
      switch (state) {
        case 'ready':
          this._loadingOverlay.classList.remove('visible');
          this._bigPlayBtn.classList.add('visible');
          // Auto-play
          this._video.play().catch(() => {
            this._bigPlayBtn.classList.add('visible');
          });
          break;
        case 'buffering':
          if (this._video.currentTime > 0) {
            this._loadingOverlay.classList.add('visible');
          }
          break;
        case 'playing':
          this._loadingOverlay.classList.remove('visible');
          break;
        case 'complete':
          this._loadingOverlay.classList.remove('visible');
          break;
      }
    });

    this._engine.on('error', (msg) => {
      this._showError(msg);
    });

    this._engine.on('buffer-health', (data) => {
      this._bufferIndicator.updateBufferHealth(data);
    });

    this._engine.network.on('speed-update', (data) => {
      this._bufferIndicator.updateNetworkSpeed(data);
    });

    // Video waiting/playing for native mode
    this._video.addEventListener('waiting', () => {
      this._loadingOverlay.classList.add('visible');
      this._loadingOverlay.querySelector('.loading-text').textContent = 'Buffering...';
    });

    this._video.addEventListener('canplay', () => {
      this._loadingOverlay.classList.remove('visible');
    });

    this._video.addEventListener('playing', () => {
      this._loadingOverlay.classList.remove('visible');
    });

    // Initialize
    const success = await this._engine.initialize(this._url);
    if (!success && !this._engine) {
      // Engine may have already emitted error
    }
  }

  _updateLoadingText(state) {
    const textEl = this._loadingOverlay.querySelector('.loading-text');
    if (!textEl) return;
    switch (state) {
      case 'probing': textEl.textContent = 'Connecting to stream...'; break;
      case 'initializing-mse': textEl.textContent = 'Initializing streaming engine...'; break;
      case 'initializing-native': textEl.textContent = 'Loading video...'; break;
      case 'buffering': textEl.textContent = 'Buffering...'; break;
      case 'loading': textEl.textContent = 'Loading video...'; break;
      default: textEl.textContent = 'Preparing...'; break;
    }
  }

  _showError(message) {
    this._loadingOverlay.classList.remove('visible');
    this._bigPlayBtn.classList.remove('visible');
    this._errorOverlay.style.display = 'flex';
    this._errorOverlay.querySelector('.error-message').textContent = message;
  }

  _startAnimLoop() {
    const update = () => {
      if (this._controls) this._controls.updateSeekBar();
      this._animFrameId = requestAnimationFrame(update);
    };
    this._animFrameId = requestAnimationFrame(update);
  }

  get element() {
    return this._element;
  }

  destroy() {
    if (this._animFrameId) {
      cancelAnimationFrame(this._animFrameId);
    }
    if (this._engine) {
      this._engine.destroy();
      this._engine = null;
    }
    if (this._controls) {
      this._controls.destroy();
    }
    if (this._video) {
      this._video.pause();
      this._video.removeAttribute('src');
      this._video.load();
    }
    this._element = null;
  }
}
