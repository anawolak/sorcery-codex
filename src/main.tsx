import { render } from 'preact';
import { App } from './app';
import { loadStore } from './data';
import { autoDownload } from './offline';
import { initPwa } from './pwa';
import { initRouter, onRouteChange } from './router';
import { initSearch } from './search/engine';
import './styles.css';

const root = document.getElementById('app')!;

async function boot() {
  initPwa();
  try {
    await loadStore();
  } catch (err) {
    root.innerHTML = `<div class="boot-error"><h1>Couldn’t load the Codex</h1><p>${(err as Error).message}. Connect to the internet once so the data can be saved for offline use.</p><button onclick="location.reload()">Try again</button></div>`;
    return;
  }
  initSearch();
  initRouter();
  // Synchronous top-level render so view transitions capture the new page in their callback.
  onRouteChange(() => render(<App />, root));
  render(<App />, root);
  document.documentElement.classList.add('ready');
  autoDownload();
}

boot();
