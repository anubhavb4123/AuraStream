// ============================================
// AuraStream — Header Component
// ============================================

import { createElement } from '../utils/helpers.js';
import { APP_NAME } from '../utils/constants.js';

export class Header {
  constructor(onLogoClick) {
    this._onLogoClick = onLogoClick;
    this._element = this._create();
  }

  _create() {
    const logo = createElement('div', {
      className: 'header-logo',
      id: 'aura-logo',
      html: `
        <svg width="32" height="32" viewBox="0 0 64 64">
          <defs>
            <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#7c3aed"/>
              <stop offset="50%" style="stop-color:#06b6d4"/>
              <stop offset="100%" style="stop-color:#ec4899"/>
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="30" fill="transparent" stroke="url(#logo-grad)" stroke-width="2.5"/>
          <polygon points="26,18 26,46 48,32" fill="url(#logo-grad)"/>
        </svg>
        <span class="gradient-text animate-gradient header-title">${APP_NAME}</span>
      `,
    });

    logo.addEventListener('click', () => {
      if (this._onLogoClick) this._onLogoClick();
    });

    const header = createElement('header', {
      className: 'glass app-header',
      id: 'aura-header',
      children: [logo],
    });

    return header;
  }

  get element() {
    return this._element;
  }
}

// Inject header styles
const headerStyles = document.createElement('style');
headerStyles.textContent = `
  .app-header {
    position: sticky;
    top: 0;
    z-index: var(--z-sticky);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-6);
    border-bottom: var(--border-subtle);
  }

  .header-logo {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    cursor: pointer;
    transition: opacity var(--transition-fast);
  }

  .header-logo:hover {
    opacity: 0.85;
  }

  .header-title {
    font-size: var(--font-size-xl);
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  @media (max-width: 480px) {
    .app-header {
      padding: var(--space-3) var(--space-4);
    }
    .header-title {
      font-size: var(--font-size-lg);
    }
  }
`;
document.head.appendChild(headerStyles);
