import { useEffect, useState } from 'preact/hooks';

export const GOATCOUNTER_CODE = 'anawolak';

const SESSION_GAP_MS = 30 * 60 * 1000;
const LAST_KEY = 'visit-last';
const PENDING_KEY = 'visit-pending';
const TOTAL_KEY = 'visit-total';

const enabled = () => !!GOATCOUNTER_CODE && !/^(localhost|127\.|\[::1\])/.test(location.hostname);
const base = () => `https://${GOATCOUNTER_CODE}.goatcounter.com`;

function get(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function set(key: string, value: string | null) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
}

function send() {
  const url = `${base()}/count?p=${encodeURIComponent('/')}&t=${encodeURIComponent('Sorcery Codex')}&s=${screen.width}&rnd=${Math.random().toString(36).slice(2)}`;
  return fetch(url, { mode: 'no-cors', cache: 'no-store', keepalive: true }).then(
    () => set(PENDING_KEY, null),
    () => set(PENDING_KEY, '1'),
  );
}

function maybeCount() {
  const now = Date.now();
  const last = Number(get(LAST_KEY) ?? 0);
  if (now - last >= SESSION_GAP_MS) set(PENDING_KEY, '1');
  set(LAST_KEY, String(now));
  if (get(PENDING_KEY) && navigator.onLine) send();
}

export function initVisits() {
  if (!enabled()) return;
  maybeCount();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') maybeCount();
    else set(LAST_KEY, String(Date.now()));
  });
  window.addEventListener('online', () => get(PENDING_KEY) && send());
}

export interface VisitTotal {
  count: string;
  at: string;
}

export function useVisitTotal(): VisitTotal | null {
  const [total, setTotal] = useState<VisitTotal | null>(() => {
    try {
      return JSON.parse(get(TOTAL_KEY) ?? 'null');
    } catch {
      return null;
    }
  });
  useEffect(() => {
    if (!enabled() || !navigator.onLine) return;
    fetch(`${base()}/counter/${encodeURIComponent('/')}.json`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j?.count) return;
        const v = { count: String(j.count), at: new Date().toISOString() };
        set(TOTAL_KEY, JSON.stringify(v));
        setTotal(v);
      })
      .catch(() => {});
  }, []);
  return enabled() ? total : null;
}
