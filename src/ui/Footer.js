// ============================================
// AuraStream — Footer Component
// ============================================

import { createElement } from '../utils/helpers.js';

export class Footer {
  constructor() {
    this._element = this._create();
  }

  _create() {
    const footer = createElement('footer', {
      className: 'app-footer',
      id: 'aura-footer'
    });

    const content = createElement('div', {
      className: 'footer-content'
    });

    // ── Divider ──────────────────────────────
    const divider = createElement('div', {
      className: 'footer-divider'
    });

    const dividerInner = createElement('div', {
      className: 'footer-divider-line'
    });

    divider.appendChild(dividerInner);

    // ── Main row ─────────────────────────────
    const mainRow = createElement('div', {
      className: 'footer-main'
    });

    // Brand + copyright
    const brand = createElement('div', {
      className: 'footer-brand',
      html: `
        <span class="footer-logo-text">Aurastream</span>
        <span class="footer-copy">&copy; 2026 Aurastream. All rights reserved.</span>
      `
    });

    // Links
    const linksSection = createElement('div', {
      className: 'footer-links'
    });

    ['Privacy', 'Terms', 'Contact'].forEach((text, i, arr) => {
      const link = createElement('a', {
        href: '#',
        className: 'footer-link',
        textContent: text
      });
      linksSection.appendChild(link);

      if (i < arr.length - 1) {
        const sep = createElement('span', {
          className: 'footer-sep',
          textContent: '/'
        });
        linksSection.appendChild(sep);
      }
    });

    // Built-by credit
    const credit = createElement('div', {
      className: 'footer-credit',
      html: `<span>Crafted by</span> <strong>Anubhav Bajpai</strong>`
    });

    mainRow.appendChild(brand);
    mainRow.appendChild(linksSection);
    mainRow.appendChild(credit);

    content.appendChild(divider);
    content.appendChild(mainRow);
    footer.appendChild(content);

    return footer;
  }

  get element() {
    return this._element;
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────
const footerStyles = document.createElement('style');
footerStyles.textContent = `
  .app-footer {
    width: 100%;
    padding: 0 var(--space-6) var(--space-5);
    margin-top: auto;
  }

  .footer-content {
    max-width: 1200px;
    margin: 0 auto;
  }

  /* ── Divider ── */
  .footer-divider {
    padding: 0 0 var(--space-5);
  }

  .footer-divider-line {
    height: 1px;
    background: linear-gradient(
      to right,
      transparent,
      rgba(124, 58, 237, 0.35) 20%,
      rgba(6, 182, 212, 0.35) 50%,
      rgba(236, 72, 153, 0.35) 80%,
      transparent
    );
  }

  /* ── Main row ── */
  .footer-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    flex-wrap: wrap;
  }

  /* ── Brand ── */
  .footer-brand {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .footer-logo-text {
    font-size: var(--font-size-sm);
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: linear-gradient(to right, #7c3aed, #06b6d4, #ec4899);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    line-height: 1;
  }

  .footer-copy {
    font-size: var(--font-size-xs);
    color: var(--text-muted);
    opacity: 0.55;
    letter-spacing: 0.01em;
    white-space: nowrap;
  }

  /* ── Links ── */
  .footer-links {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .footer-link {
    font-size: var(--font-size-xs);
    color: var(--text-muted);
    text-decoration: none;
    letter-spacing: 0.04em;
    opacity: 0.6;
    transition: opacity 0.2s ease, color 0.2s ease;
  }

  .footer-link:hover {
    opacity: 1;
    color: var(--text-base);
  }

  .footer-sep {
    font-size: 10px;
    color: var(--text-muted);
    opacity: 0.25;
    user-select: none;
  }

  /* ── Credit ── */
  .footer-credit {
    font-size: var(--font-size-xs);
    color: var(--text-muted);
    opacity: 0.45;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }

  .footer-credit strong {
    color: var(--text-muted);
    font-weight: 600;
    opacity: 0.85;
  }

  /* ── Responsive ── */
  @media (max-width: 640px) {
    .footer-main {
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: var(--space-3);
    }

    .footer-brand {
      align-items: center;
    }

    .footer-copy {
      white-space: normal;
      text-align: center;
    }
  }
`;
document.head.appendChild(footerStyles);
