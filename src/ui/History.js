// ============================================
// AuraStream — History Component
// ============================================

import { createElement, getFilenameFromUrl } from '../utils/helpers.js';
import { getHistory, clearHistory } from '../utils/storage.js';

export class History {
  constructor(onSelect) {
    this._onSelect = onSelect;
    this._element = null;
    this._listEl = null;
    this._element = this._create();
  }

  _create() {
    const items = getHistory();
    if (items.length === 0) return null;

    const header = createElement('div', {
      className: 'history-header',
      children: [
        createElement('h3', {
          className: 'history-title',
          text: 'Recently Streamed',
        }),
        createElement('button', {
          className: 'history-clear-btn',
          text: 'Clear',
          id: 'aura-clear-history',
        }),
      ],
    });

    header.querySelector('.history-clear-btn').addEventListener('click', () => {
      clearHistory();
      this._element.style.animation = 'fade-out 200ms ease forwards';
      setTimeout(() => {
        this._element.style.display = 'none';
      }, 200);
    });

    this._listEl = createElement('div', { className: 'history-list stagger-children' });
    this._renderItems(items);

    this._element = createElement('div', {
      className: 'history-section animate-fade-in-up',
      id: 'aura-history',
      children: [header, this._listEl],
    });

    return this._element;
  }

  _renderItems(items) {
    if (!this._listEl) return;
    this._listEl.innerHTML = '';

    items.forEach(item => {
      const age = this._formatAge(item.timestamp);
      const filename = getFilenameFromUrl(item.url);

      const card = createElement('button', {
        className: 'history-item gradient-border',
        html: `
          <div class="history-item-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </div>
          <div class="history-item-info">
            <div class="history-item-name" title="${item.url}">${filename}</div>
            <div class="history-item-time">${age}</div>
          </div>
          <div class="history-item-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        `,
      });

      card.addEventListener('click', () => {
        if (this._onSelect) this._onSelect(item.url);
      });

      this._listEl.appendChild(card);
    });
  }

  _formatAge(timestamp) {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  /**
   * Refresh the list
   */
  refresh() {
    const items = getHistory();
    if (items.length === 0) {
      if (this._element) this._element.style.display = 'none';
      return;
    }
    if (this._element) {
      this._element.style.display = '';
      this._renderItems(items);
    }
  }

  get element() {
    return this._element;
  }
}

// History styles
const historyStyles = document.createElement('style');
historyStyles.textContent = `
  .history-section {
    width: 100%;
    max-width: 640px;
    margin-top: var(--space-8);
  }

  .history-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-4);
  }

  .history-title {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .history-clear-btn {
    font-size: var(--font-size-xs);
    color: var(--text-tertiary);
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-full);
    transition: all var(--transition-fast);
  }

  .history-clear-btn:hover {
    background: var(--bg-surface-hover);
    color: var(--color-error);
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .history-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    background: var(--bg-surface);
    transition: all var(--transition-fast);
    cursor: pointer;
    text-align: left;
    width: 100%;
  }

  .history-item:hover {
    background: var(--bg-surface-hover);
    transform: translateX(4px);
  }

  .history-item-icon {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-sm);
    background: var(--gradient-subtle);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .history-item-icon svg {
    width: 16px;
    height: 16px;
    stroke: var(--accent-purple);
  }

  .history-item-info {
    flex: 1;
    min-width: 0;
  }

  .history-item-name {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .history-item-time {
    font-size: var(--font-size-xs);
    color: var(--text-tertiary);
    margin-top: 2px;
  }

  .history-item-arrow {
    flex-shrink: 0;
    opacity: 0;
    transform: translateX(-4px);
    transition: all var(--transition-fast);
  }

  .history-item:hover .history-item-arrow {
    opacity: 0.5;
    transform: translateX(0);
  }

  .history-item-arrow svg {
    width: 16px;
    height: 16px;
    stroke: var(--text-tertiary);
  }
`;
document.head.appendChild(historyStyles);
