import './styles/index.css';
import './styles/animations.css';
import './styles/player.css';
import './styles/controls.css';

// App
import { App } from './ui/App.js';

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  const rootEl = document.getElementById('app');
  if (rootEl) {
    new App(rootEl);
  }
});
