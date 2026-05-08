// AuraStream — Landing Page Component

import { createElement } from '../utils/helpers.js';
import { validateUrl } from '../core/URLValidator.js';
import { History } from './History.js';
import { showToast } from './Toast.js';
import { APP_NAME } from '../utils/constants.js';

export class Landing {
  /**
   * @param {function} onStream - Callback when user submits a valid URL
   */
  constructor(onStream) {
    this._onStream = onStream;
    this._element = null;
    this._input = null;
    this._submitBtn = null;
    this._errorText = null;
    this._history = null;

    this._element = this._create();
  }

  _create() {
    // Aurora background blobs
    const aurora = createElement('div', {
      className: 'aurora-bg',
      html: `
        <div class="aurora-blob aurora-blob--1"></div>
        <div class="aurora-blob aurora-blob--2"></div>
        <div class="aurora-blob aurora-blob--3"></div>
      `,
    });

    // Hero section
    const tagline = createElement('p', {
      className: 'landing-tagline animate-fade-in-up',
      text: 'Stream any video instantly. Just paste a URL.',
    });
    tagline.style.animationDelay = '100ms';

    const title = createElement('h1', {
      className: 'landing-title animate-fade-in-up',
    });
    title.innerHTML = `<span class="gradient-text animate-gradient">${APP_NAME}</span>`;

    const subtitle = createElement('p', {
      className: 'landing-subtitle animate-fade-in-up',
      text: 'Progressive chunk-based streaming with smart buffering. No downloads. No waiting.',
    });
    subtitle.style.animationDelay = '200ms';

    // URL Input
    this._input = createElement('input', {
      className: 'landing-input',
      id: 'aura-url-input',
      attrs: {
        type: 'url',
        placeholder: 'Paste video URL here... (e.g., https://example.com/video.mp4)',
        autocomplete: 'off',
        spellcheck: 'false',
      },
    });

    this._submitBtn = createElement('button', {
      className: 'landing-submit-btn animate-gradient',
      id: 'aura-stream-btn',
      html: `
        <span>Stream Now</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>
        </svg>
      `,
    });

    // Paste from clipboard button
    const pasteBtn = createElement('button', {
      className: 'landing-paste-btn',
      id: 'aura-paste-btn',
      html: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
        </svg>
        Paste
      `,
    });

    this._errorText = createElement('div', {
      className: 'landing-error',
      id: 'aura-url-error',
    });

    const inputRow = createElement('div', {
      className: 'landing-input-row animate-fade-in-up',
    });
    inputRow.style.animationDelay = '300ms';
    inputRow.appendChild(this._input);
    inputRow.appendChild(pasteBtn);

    const inputSection = createElement('div', {
      className: 'landing-input-section',
      children: [inputRow, this._submitBtn, this._errorText],
    });

    // Features
    const features = createElement('div', {
      className: 'landing-features animate-fade-in-up stagger-children',
    });
    features.style.animationDelay = '400ms';

    const featureData = [
      { icon: '⚡', title: 'Instant Play', desc: 'Start watching in seconds' },
      { icon: '🔄', title: 'Smart Buffer', desc: '5-minute rolling window' },
      { icon: '📊', title: 'Adaptive', desc: 'Auto-adjusts to your network' },
      { icon: '🎮', title: 'Full Control', desc: 'Speed, seek & shortcuts' },
    ];

    featureData.forEach(f => {
      features.appendChild(createElement('div', {
        className: 'landing-feature glass',
        html: `
          <span class="landing-feature-icon">${f.icon}</span>
          <span class="landing-feature-title">${f.title}</span>
          <span class="landing-feature-desc">${f.desc}</span>
        `,
      }));
    });

    // History
    this._history = new History((url) => {
      this._input.value = url;
      this._handleSubmit();
    });

    // Assemble
    const content = createElement('div', {
      className: 'landing-content',
      children: [
        title,
        tagline,
        subtitle,
        inputSection,
        features,
        this._history?.element,
      ].filter(Boolean),
    });

    const page = createElement('div', {
      className: 'landing-page',
      children: [aurora, content],
    });

    // Events
    this._input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._handleSubmit();
      this._clearError();
    });

    this._input.addEventListener('input', () => this._clearError());

    this._submitBtn.addEventListener('click', () => this._handleSubmit());

    pasteBtn.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          this._input.value = text;
          this._input.focus();
          showToast('URL pasted from clipboard', 'success');
        }
      } catch {
        showToast('Unable to access clipboard. Please paste manually.', 'warning');
      }
    });

    // Focus input on page load
    setTimeout(() => this._input.focus(), 500);

    return page;
  }

  _handleSubmit() {
    const value = this._input.value;
    const result = validateUrl(value);

    if (!result.valid) {
      this._showError(result.error);
      return;
    }

    if (this._onStream) {
      this._onStream(result.url);
    }
  }

  _showError(msg) {
    this._errorText.textContent = msg;
    this._errorText.classList.add('visible');
    this._input.classList.add('error');
  }

  _clearError() {
    this._errorText.classList.remove('visible');
    this._input.classList.remove('error');
  }

  get element() {
    return this._element;
  }

  destroy() {
    this._element = null;
  }
}

// Landing page styles
const landingStyles = document.createElement('style');
landingStyles.textContent = `
  .landing-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .landing-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-8) var(--space-6);
    position: relative;
    z-index: var(--z-base);
    text-align: center;
    gap: var(--space-4);
    max-width: 800px;
    margin: 0 auto;
    width: 100%;
  }

  .landing-title {
    font-size: var(--font-size-6xl);
    font-weight: 800;
    letter-spacing: -0.04em;
    line-height: 1.1;
  }

  .landing-tagline {
    font-size: var(--font-size-lg);
    color: var(--text-secondary);
    font-weight: 400;
    opacity: 0;
  }

  .landing-subtitle {
    font-size: var(--font-size-base);
    color: var(--text-tertiary);
    max-width: 500px;
    line-height: 1.7;
    opacity: 0;
  }

  .landing-input-section {
    width: 100%;
    max-width: 640px;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    align-items: center;
    margin-top: var(--space-4);
  }

  .landing-input-row {
    width: 100%;
    display: flex;
    gap: var(--space-2);
    opacity: 0;
  }

  .landing-input {
    flex: 1;
    padding: var(--space-4) var(--space-5);
    border-radius: var(--radius-lg);
    background: var(--bg-surface);
    border: var(--border-glass);
    color: var(--text-primary);
    font-size: var(--font-size-base);
    transition: all var(--transition-base);
    min-width: 0;
  }

  .landing-input::placeholder {
    color: var(--text-muted);
  }

  .landing-input:focus {
    border-color: rgba(124, 58, 237, 0.5);
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1), var(--shadow-glow-purple);
    background: var(--bg-surface-hover);
  }

  .landing-input.error {
    border-color: rgba(239, 68, 68, 0.5);
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
  }

  .landing-paste-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-lg);
    background: var(--bg-surface);
    border: var(--border-glass);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    font-weight: 500;
    white-space: nowrap;
    transition: all var(--transition-fast);
  }

  .landing-paste-btn:hover {
    background: var(--bg-surface-hover);
    color: var(--text-primary);
  }

  .landing-submit-btn {
    padding: var(--space-4) var(--space-10);
    border-radius: var(--radius-full);
    background: var(--gradient-aura);
    background-size: 200% 200%;
    color: white;
    font-size: var(--font-size-base);
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: var(--space-3);
    transition: transform var(--transition-fast), box-shadow var(--transition-fast);
    box-shadow: var(--shadow-glow-aura);
    letter-spacing: 0.02em;
  }

  .landing-submit-btn:hover {
    transform: scale(1.03);
    box-shadow: 0 0 40px rgba(124, 58, 237, 0.3), 0 0 80px rgba(6, 182, 212, 0.15);
  }

  .landing-submit-btn:active {
    transform: scale(0.98);
  }

  .landing-submit-btn svg {
    width: 18px;
    height: 18px;
  }

  .landing-error {
    font-size: var(--font-size-sm);
    color: var(--color-error);
    min-height: 20px;
    opacity: 0;
    transition: opacity var(--transition-fast);
  }

  .landing-error.visible {
    opacity: 1;
  }

  .landing-features {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-3);
    margin-top: var(--space-8);
    width: 100%;
    max-width: 640px;
  }

  .landing-feature {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-5) var(--space-3);
    border-radius: var(--radius-lg);
    transition: all var(--transition-base);
    cursor: default;
  }

  .landing-feature:hover {
    background: var(--bg-surface-hover);
    transform: translateY(-2px);
  }

  .landing-feature-icon {
    font-size: 24px;
  }

  .landing-feature-title {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--text-primary);
  }

  .landing-feature-desc {
    font-size: var(--font-size-xs);
    color: var(--text-tertiary);
  }

  @media (max-width: 768px) {
    .landing-title {
      font-size: var(--font-size-4xl);
    }

    .landing-content {
      padding: var(--space-6) var(--space-4);
      justify-content: flex-start;
      padding-top: var(--space-16);
    }

    .landing-features {
      grid-template-columns: repeat(2, 1fr);
    }

    .landing-input-row {
      flex-direction: column;
    }

    .landing-paste-btn {
      justify-content: center;
    }
  }

  @media (max-width: 480px) {
    .landing-title {
      font-size: var(--font-size-3xl);
    }

    .landing-subtitle {
      font-size: var(--font-size-sm);
    }
  }
`;
document.head.appendChild(landingStyles);
