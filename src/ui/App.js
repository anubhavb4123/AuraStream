// AuraStream — Main App Shell

import { createElement } from '../utils/helpers.js';
import { Header } from './Header.js';
import { Footer } from './Footer.js';
import { Landing } from './Landing.js';
import { VideoPlayer } from '../player/VideoPlayer.js';
import { addToHistory } from '../utils/storage.js';

export class App {
  constructor(rootEl) {
    this._root = rootEl;
    this._header = null;
    this._currentView = null; // 'landing' | 'player'
    this._landing = null;
    this._player = null;
    this._footer = null;

    this._init();
  }

  _init() {
    // Header
    this._header = new Header(() => this._showLanding());
    this._root.appendChild(this._header.element);

    // Content container
    this._contentEl = createElement('main', {
      className: 'app-content',
      id: 'aura-content',
    });
    this._root.appendChild(this._contentEl);

    // Footer
    this._footer = new Footer();
    this._root.appendChild(this._footer.element);

    // Show landing by default
    this._showLanding();
  }

  _showLanding() {
    // Cleanup player if exists
    if (this._player) {
      this._player.destroy();
      this._player = null;
    }

    this._contentEl.innerHTML = '';

    this._landing = new Landing((url) => this._startStreaming(url));

    // Animate transition
    this._contentEl.appendChild(this._landing.element);
    this._currentView = 'landing';
  }

  _startStreaming(url) {
    // Add to history
    addToHistory(url);

    // Cleanup landing
    if (this._landing) {
      this._landing.destroy();
      this._landing = null;
    }

    this._contentEl.innerHTML = '';

    // Create player
    this._player = new VideoPlayer(url, () => this._showLanding());

    this._contentEl.appendChild(this._player.element);
    this._currentView = 'player';
  }
}

// App content styles
const appStyles = document.createElement('style');
appStyles.textContent = `
  .app-content {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
`;
document.head.appendChild(appStyles);
