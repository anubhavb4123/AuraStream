// ============================================
// AuraStream — Player Controls Component
// ============================================

import { createElement, formatTime } from '../utils/helpers.js';
import { PLAYBACK_SPEEDS, CONTROLS_HIDE_DELAY, SEEK_STEP, VOLUME_STEP, SHORTCUTS } from '../utils/constants.js';
import { getSavedVolume, saveVolume, getSavedSpeed, saveSpeed } from '../utils/storage.js';
import { SeekBar } from './SeekBar.js';

// SVG icons
const ICONS = {
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
  volumeHigh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><path d="M19.07 4.93a10 10 0 010 14.14"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>`,
  volumeLow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>`,
  volumeMute: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`,
  fullscreen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`,
  exitFullscreen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`,
  forward: `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="4,4 15,12 4,20"/><polygon points="13,4 24,12 13,20"/></svg>`,
  backward: `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="20,4 9,12 20,20"/><polygon points="11,4 0,12 11,20"/></svg>`,
};

export class Controls {
  /**
   * @param {HTMLVideoElement} video
   * @param {HTMLElement} playerWrapper
   */
  constructor(video, playerWrapper) {
    this._video = video;
    this._playerWrapper = playerWrapper;
    this._element = null;
    this._seekBar = null;
    this._isFullscreen = false;
    this._hideTimer = null;
    this._speedMenuOpen = false;
    this._currentSpeed = getSavedSpeed();
    this._onSeek = null;

    // Elements
    this._playBtn = null;
    this._volumeBtn = null;
    this._volumeSlider = null;
    this._timeDisplay = null;
    this._speedBtn = null;
    this._speedMenu = null;
    this._fullscreenBtn = null;

    this._element = this._create();
    this._bindEvents();
    this._restorePreferences();
  }

  set onSeek(fn) {
    this._onSeek = fn;
    if (this._seekBar) this._seekBar.onSeek = fn;
  }

  _create() {
    // Seek bar
    this._seekBar = new SeekBar(this._video);

    // Play/Pause button
    this._playBtn = createElement('button', {
      className: 'ctrl-btn play-btn',
      id: 'aura-play-btn',
      html: ICONS.play,
      attrs: { 'aria-label': 'Play', title: 'Play (K)' },
    });

    // Backward button
    const backwardBtn = createElement('button', {
      className: 'ctrl-btn',
      id: 'aura-backward-btn',
      html: ICONS.backward,
      attrs: { 'aria-label': 'Rewind 10s', title: 'Rewind 10s (←)' },
    });
    backwardBtn.addEventListener('click', () => {
      this._video.currentTime = Math.max(0, this._video.currentTime - SEEK_STEP);
    });

    // Forward button
    const forwardBtn = createElement('button', {
      className: 'ctrl-btn',
      id: 'aura-forward-btn',
      html: ICONS.forward,
      attrs: { 'aria-label': 'Forward 10s', title: 'Forward 10s (→)' },
    });
    forwardBtn.addEventListener('click', () => {
      this._video.currentTime = Math.min(this._video.duration || 0, this._video.currentTime + SEEK_STEP);
    });

    // Volume control
    this._volumeBtn = createElement('button', {
      className: 'ctrl-btn',
      id: 'aura-volume-btn',
      html: ICONS.volumeHigh,
      attrs: { 'aria-label': 'Mute', title: 'Mute (M)' },
    });

    this._volumeSlider = createElement('input', {
      className: 'volume-slider',
      id: 'aura-volume-slider',
      attrs: { type: 'range', min: '0', max: '1', step: '0.01', value: '1' },
    });

    const volumeSliderWrapper = createElement('div', {
      className: 'volume-slider-wrapper',
      children: [this._volumeSlider],
    });

    const volumeControl = createElement('div', {
      className: 'volume-control',
      children: [this._volumeBtn, volumeSliderWrapper],
    });

    // Time display
    this._timeDisplay = createElement('div', {
      className: 'time-display',
      id: 'aura-time-display',
      text: '0:00 / 0:00',
    });

    // Speed selector
    this._speedBtn = createElement('button', {
      className: 'speed-btn',
      id: 'aura-speed-btn',
      text: '1x',
      attrs: { 'aria-label': 'Playback speed', title: 'Speed' },
    });

    this._speedMenu = this._createSpeedMenu();

    const speedSelector = createElement('div', {
      className: 'speed-selector',
      children: [this._speedBtn, this._speedMenu],
    });

    // Fullscreen button
    this._fullscreenBtn = createElement('button', {
      className: 'ctrl-btn',
      id: 'aura-fullscreen-btn',
      html: ICONS.fullscreen,
      attrs: { 'aria-label': 'Fullscreen', title: 'Fullscreen (F)' },
    });

    // Assemble
    const controlsLeft = createElement('div', {
      className: 'controls-left',
      children: [this._playBtn, backwardBtn, forwardBtn, volumeControl, this._timeDisplay],
    });

    const controlsRight = createElement('div', {
      className: 'controls-right',
      children: [speedSelector, this._fullscreenBtn],
    });

    const controlsRow = createElement('div', {
      className: 'controls-row',
      children: [controlsLeft, createElement('div', { className: 'controls-center' }), controlsRight],
    });

    const container = createElement('div', {
      className: 'player-controls always-show',
      id: 'aura-controls',
      children: [this._seekBar.element, controlsRow],
    });

    // Prevent clicks on controls from bubbling to the video container
    // (which toggles play/pause on click)
    container.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    return container;
  }

  _createSpeedMenu() {
    const menu = createElement('div', { className: 'speed-menu hidden', id: 'aura-speed-menu' });
    PLAYBACK_SPEEDS.forEach(speed => {
      const option = createElement('button', {
        className: `speed-option ${speed === this._currentSpeed ? 'active' : ''}`,
        text: `${speed}x`,
        attrs: { 'data-speed': speed.toString() },
      });
      option.addEventListener('click', () => {
        this._setSpeed(speed);
        this._toggleSpeedMenu(false);
      });
      menu.appendChild(option);
    });
    return menu;
  }

  _bindEvents() {
    const video = this._video;

    // Play/Pause
    this._playBtn.addEventListener('click', () => this.togglePlay());
    video.addEventListener('play', () => this._updatePlayButton());
    video.addEventListener('pause', () => this._updatePlayButton());
    video.addEventListener('ended', () => this._updatePlayButton());

    // Volume
    this._volumeBtn.addEventListener('click', () => this.toggleMute());
    this._volumeSlider.addEventListener('input', (e) => {
      video.volume = parseFloat(e.target.value);
      video.muted = false;
      this._updateVolumeIcon();
      saveVolume(video.volume);
    });
    video.addEventListener('volumechange', () => {
      this._volumeSlider.value = video.muted ? 0 : video.volume;
      this._updateVolumeIcon();
    });

    // Time updates
    video.addEventListener('timeupdate', () => this._updateTime());
    video.addEventListener('durationchange', () => this._updateTime());

    // Speed menu
    this._speedBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggleSpeedMenu();
    });
    document.addEventListener('click', () => this._toggleSpeedMenu(false));

    // Fullscreen
    this._fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
    document.addEventListener('fullscreenchange', () => this._updateFullscreenButton());

    // Auto-hide controls
    this._playerWrapper.addEventListener('mousemove', () => this._showControls());
    this._playerWrapper.addEventListener('mouseleave', () => this._scheduleHide());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this._handleKeyboard(e));
  }

  _restorePreferences() {
    const volume = getSavedVolume();
    this._video.volume = volume;
    this._volumeSlider.value = volume;
    this._updateVolumeIcon();

    const speed = getSavedSpeed();
    this._setSpeed(speed);
  }

  // --- Actions ---

  togglePlay() {
    if (this._video.paused || this._video.ended) {
      this._video.play().catch(() => {});
    } else {
      this._video.pause();
    }
  }

  toggleMute() {
    this._video.muted = !this._video.muted;
    this._updateVolumeIcon();
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      this._playerWrapper.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  _setSpeed(speed) {
    this._currentSpeed = speed;
    this._video.playbackRate = speed;
    this._speedBtn.textContent = `${speed}x`;
    saveSpeed(speed);

    // Update menu
    if (this._speedMenu) {
      this._speedMenu.querySelectorAll('.speed-option').forEach(opt => {
        opt.classList.toggle('active', parseFloat(opt.dataset.speed) === speed);
      });
    }
  }

  _toggleSpeedMenu(force) {
    const show = force !== undefined ? force : !this._speedMenuOpen;
    this._speedMenuOpen = show;
    this._speedMenu.classList.toggle('hidden', !show);
  }

  // --- Updates ---

  _updatePlayButton() {
    const isPlaying = !this._video.paused && !this._video.ended;
    this._playBtn.innerHTML = isPlaying ? ICONS.pause : ICONS.play;
    this._playBtn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
    this._playBtn.title = isPlaying ? 'Pause (K)' : 'Play (K)';

    if (isPlaying) {
      this._element.classList.remove('always-show');
      this._scheduleHide();
    } else {
      this._element.classList.add('always-show');
    }
  }

  _updateVolumeIcon() {
    if (this._video.muted || this._video.volume === 0) {
      this._volumeBtn.innerHTML = ICONS.volumeMute;
    } else if (this._video.volume < 0.5) {
      this._volumeBtn.innerHTML = ICONS.volumeLow;
    } else {
      this._volumeBtn.innerHTML = ICONS.volumeHigh;
    }
  }

  _updateTime() {
    const current = formatTime(this._video.currentTime);
    const total = formatTime(this._video.duration);
    this._timeDisplay.textContent = `${current} / ${total}`;
  }

  _updateFullscreenButton() {
    this._isFullscreen = !!document.fullscreenElement;
    this._fullscreenBtn.innerHTML = this._isFullscreen ? ICONS.exitFullscreen : ICONS.fullscreen;
    this._fullscreenBtn.title = this._isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)';
    this._playerWrapper.classList.toggle('fullscreen', this._isFullscreen);
  }

  // --- Auto-hide ---

  _showControls() {
    this._element.classList.add('visible');
    this._scheduleHide();
  }

  _scheduleHide() {
    clearTimeout(this._hideTimer);
    if (this._video.paused || this._video.ended) return;
    this._hideTimer = setTimeout(() => {
      this._element.classList.remove('visible');
    }, CONTROLS_HIDE_DELAY);
  }

  // --- Keyboard ---

  _handleKeyboard(e) {
    // Don't capture if user is typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const key = e.key;

    if (SHORTCUTS.PLAY_PAUSE.includes(key)) {
      e.preventDefault();
      this.togglePlay();
    } else if (SHORTCUTS.MUTE.includes(key)) {
      e.preventDefault();
      this.toggleMute();
    } else if (SHORTCUTS.FULLSCREEN.includes(key)) {
      e.preventDefault();
      this.toggleFullscreen();
    } else if (SHORTCUTS.FORWARD.includes(key)) {
      e.preventDefault();
      this._video.currentTime = Math.min(this._video.duration || 0, this._video.currentTime + SEEK_STEP);
    } else if (SHORTCUTS.BACKWARD.includes(key)) {
      e.preventDefault();
      this._video.currentTime = Math.max(0, this._video.currentTime - SEEK_STEP);
    } else if (SHORTCUTS.VOLUME_UP.includes(key)) {
      e.preventDefault();
      this._video.volume = Math.min(1, this._video.volume + VOLUME_STEP);
    } else if (SHORTCUTS.VOLUME_DOWN.includes(key)) {
      e.preventDefault();
      this._video.volume = Math.max(0, this._video.volume - VOLUME_STEP);
    } else if (SHORTCUTS.SPEED_UP.includes(key)) {
      e.preventDefault();
      const idx = PLAYBACK_SPEEDS.indexOf(this._currentSpeed);
      if (idx < PLAYBACK_SPEEDS.length - 1) this._setSpeed(PLAYBACK_SPEEDS[idx + 1]);
    } else if (SHORTCUTS.SPEED_DOWN.includes(key)) {
      e.preventDefault();
      const idx = PLAYBACK_SPEEDS.indexOf(this._currentSpeed);
      if (idx > 0) this._setSpeed(PLAYBACK_SPEEDS[idx - 1]);
    } else if (key >= '0' && key <= '9') {
      e.preventDefault();
      const pct = parseInt(key) / 10;
      this._video.currentTime = pct * (this._video.duration || 0);
    }

    this._showControls();
  }

  /**
   * Update seek bar (call from requestAnimationFrame)
   */
  updateSeekBar() {
    if (this._seekBar) this._seekBar.update();
  }

  get element() {
    return this._element;
  }

  destroy() {
    clearTimeout(this._hideTimer);
    if (this._seekBar) this._seekBar.destroy();
    this._element = null;
  }
}
