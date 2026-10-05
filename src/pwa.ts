import { registerSW } from 'virtual:pwa-register';

let registration: ServiceWorkerRegistration | undefined;
let updateSW: ((reload?: boolean) => Promise<void>) | undefined;
let needRefresh = false;
const subs = new Set<(v: boolean) => void>();

export function initPwa() {
  if (!('serviceWorker' in navigator)) return;
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      needRefresh = true;
      subs.forEach((fn) => fn(true));
    },
    onRegisteredSW(_url, reg) {
      registration = reg;
    },
  });
  // Home-screen apps are rarely reloaded; look for new data whenever the app comes back to the foreground.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) registration?.update().catch(() => {});
  });
}

export function onUpdateAvailable(fn: (v: boolean) => void) {
  subs.add(fn);
  fn(needRefresh);
  return () => void subs.delete(fn);
}

export function applyUpdate() {
  updateSW?.(true);
}

export async function checkForUpdate(): Promise<string> {
  if (!registration) return 'Updates are available in the installed app.';
  if (!navigator.onLine) return 'You are offline.';
  try {
    await registration.update();
    await new Promise((r) => setTimeout(r, 1500));
    return needRefresh || registration.waiting || registration.installing ? 'Update found — see the banner.' : 'You have the latest data.';
  } catch {
    return 'Could not check for updates.';
  }
}
