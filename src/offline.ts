import { cardImage, getStore } from './data';

export const IMAGE_CACHE = 'card-images';
const CONCURRENCY = 6;

export interface OfflineState {
  status: 'idle' | 'checking' | 'downloading' | 'done' | 'error' | 'unsupported';
  done: number;
  total: number;
  failed: number;
  persisted: boolean | null;
  usage: number | null;
}

let state: OfflineState = { status: 'idle', done: 0, total: 0, failed: 0, persisted: null, usage: null };
const subs = new Set<(s: OfflineState) => void>();
let running: Promise<void> | null = null;

function set(patch: Partial<OfflineState>) {
  state = { ...state, ...patch };
  subs.forEach((fn) => fn(state));
}

export const getOfflineState = () => state;
export function subscribeOffline(fn: (s: OfflineState) => void) {
  subs.add(fn);
  return () => void subs.delete(fn);
}

async function refreshStorageInfo() {
  try {
    const est = await navigator.storage?.estimate?.();
    const persisted = (await navigator.storage?.persisted?.()) ?? null;
    set({ usage: est?.usage ?? null, persisted });
  } catch {}
}

export function downloadAllImages(): Promise<void> {
  if (running) return running;
  if (!('caches' in window)) {
    set({ status: 'unsupported' });
    return Promise.resolve();
  }
  running = (async () => {
    try {
      set({ status: 'checking', failed: 0 });
      try {
        await navigator.storage?.persist?.();
      } catch {}
      const cache = await caches.open(IMAGE_CACHE);
      const urls = getStore().db.cards.map((c) => new URL(cardImage(c), location.href).href);
      const have = new Set((await cache.keys()).map((r) => r.url));
      const todo = urls.filter((u) => !have.has(u));
      set({ total: urls.length, done: urls.length - todo.length, status: todo.length ? 'downloading' : 'done' });

      let failed = 0;
      const worker = async () => {
        for (let url = todo.pop(); url; url = todo.pop()) {
          try {
            const res = await fetch(url, { cache: 'no-cache' });
            if (!res.ok) throw new Error(String(res.status));
            await cache.put(url, res);
          } catch {
            failed++;
          }
          set({ done: state.done + 1, failed });
        }
      };
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));

      const keep = new Set(urls);
      for (const req of await cache.keys()) if (!keep.has(req.url)) await cache.delete(req);

      set({ status: failed ? 'error' : 'done' });
      try {
        localStorage.setItem('images-version', getStore().db.version);
      } catch {}
    } catch {
      set({ status: 'error' });
    } finally {
      running = null;
      refreshStorageInfo();
    }
  })();
  return running;
}

export function autoDownload() {
  refreshStorageInfo();
  let v: string | null = null;
  try {
    v = localStorage.getItem('images-version');
  } catch {}
  const start = () => downloadAllImages();
  if (v === getStore().db.version) {
    setTimeout(start, 4000);
  } else {
    setTimeout(start, 1500);
  }
}
