// ============================================
// AuraStream — Buffer Indicator Component
// ============================================

import { createElement, formatTime, formatSpeed } from '../utils/helpers.js';

export class BufferIndicator {
  constructor() {
    this._bufferBadge = null;
    this._networkBadge = null;
    this._bufferDot = null;
    this._bufferText = null;
    this._networkText = null;

    this._createBufferBadge();
    this._createNetworkBadge();
  }

  _createBufferBadge() {
    this._bufferDot = createElement('div', { className: 'buffer-status-dot healthy' });
    this._bufferText = createElement('span', { text: 'Buffered: 0s' });

    this._bufferBadge = createElement('div', {
      className: 'buffer-status-badge',
      id: 'aura-buffer-badge',
      children: [this._bufferDot, this._bufferText],
    });
  }

  _createNetworkBadge() {
    const icon = createElement('span', {
      html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>`,
    });
    icon.style.display = 'flex';

    this._networkText = createElement('span', { text: '— Mbps' });

    this._networkBadge = createElement('div', {
      className: 'network-speed-badge',
      id: 'aura-network-badge',
      children: [icon, this._networkText],
    });
  }

  /**
   * Update buffer health display
   */
  updateBufferHealth({ status, ahead }) {
    // Update dot color
    this._bufferDot.className = `buffer-status-dot ${status}`;

    // Update text
    this._bufferText.textContent = `Buffered: ${Math.round(ahead)}s`;

    // Show badge
    this._bufferBadge.classList.add('visible');
  }

  /**
   * Update network speed display
   */
  updateNetworkSpeed({ bytesPerSecond }) {
    this._networkText.textContent = formatSpeed(bytesPerSecond);
  }

  get bufferElement() {
    return this._bufferBadge;
  }

  get networkElement() {
    return this._networkBadge;
  }

  destroy() {
    this._bufferBadge = null;
    this._networkBadge = null;
  }
}
