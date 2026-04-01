// ============================================
// AuraStream — Seek Bar Component
// ============================================

import { createElement, formatTime, throttle } from '../utils/helpers.js';

export class SeekBar {
  /**
   * @param {HTMLVideoElement} video
   */
  constructor(video) {
    this._video = video;
    this._isDragging = false;
    this._element = null;
    this._track = null;
    this._buffered = null;
    this._progress = null;
    this._thumb = null;
    this._tooltip = null;
    this._onSeek = null;

    this._element = this._create();
    this._bindEvents();
  }

  /**
   * Set callback for seek events
   */
  set onSeek(fn) {
    this._onSeek = fn;
  }

  _create() {
    this._track = createElement('div', { className: 'seek-bar-track' });
    this._buffered = createElement('div', { className: 'seek-bar-buffered' });
    this._progress = createElement('div', { className: 'seek-bar-progress' });
    this._thumb = createElement('div', { className: 'seek-bar-thumb' });
    this._tooltip = createElement('div', { className: 'seek-bar-tooltip', text: '0:00' });

    this._track.appendChild(this._buffered);
    this._track.appendChild(this._progress);
    this._track.appendChild(this._thumb);

    const container = createElement('div', {
      className: 'seek-bar-container',
      id: 'aura-seek-bar',
      children: [this._track, this._tooltip],
    });

    return container;
  }

  _bindEvents() {
    const container = this._element;

    // Click to seek
    container.addEventListener('click', (e) => {
      this._seekToPosition(e);
    });

    // Mouse move for tooltip
    container.addEventListener('mousemove', throttle((e) => {
      this._updateTooltip(e);
    }, 50));

    // Drag support
    container.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this._isDragging = true;
      this._seekToPosition(e);
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (this._isDragging) {
        this._seekToPosition(e);
      }
    });

    document.addEventListener('mouseup', () => {
      if (this._isDragging) {
        this._isDragging = false;
        document.body.style.userSelect = '';
      }
    });

    // Touch support
    container.addEventListener('touchstart', (e) => {
      this._isDragging = true;
      this._seekToPosition(e.touches[0]);
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
      if (this._isDragging) {
        this._seekToPosition(e.touches[0]);
      }
    }, { passive: true });

    container.addEventListener('touchend', () => {
      this._isDragging = false;
    });
  }

  _seekToPosition(e) {
    const rect = this._element.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = x / rect.width;
    const time = ratio * (this._video.duration || 0);

    if (isFinite(time)) {
      this._video.currentTime = time;
      if (this._onSeek) this._onSeek(time);
    }
  }

  _updateTooltip(e) {
    const rect = this._element.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = x / rect.width;
    const time = ratio * (this._video.duration || 0);

    this._tooltip.textContent = formatTime(time);
    this._tooltip.style.left = `${x}px`;
  }

  /**
   * Update visual state — call on animation frame
   */
  update() {
    const video = this._video;
    if (!video || !video.duration) return;

    const duration = video.duration;

    // Progress
    const progressRatio = (video.currentTime / duration) * 100;
    this._progress.style.width = `${progressRatio}%`;
    this._thumb.style.left = `${progressRatio}%`;

    // Buffered ranges
    if (video.buffered.length > 0) {
      // Show the furthest buffered range
      let maxEnd = 0;
      for (let i = 0; i < video.buffered.length; i++) {
        const end = video.buffered.end(i);
        if (end > maxEnd) maxEnd = end;
      }
      const bufferedRatio = (maxEnd / duration) * 100;
      this._buffered.style.width = `${bufferedRatio}%`;
    }
  }

  get element() {
    return this._element;
  }

  destroy() {
    this._element = null;
  }
}
