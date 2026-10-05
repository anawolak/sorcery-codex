/**
 * Pinned searches and pages, plus the recent-searches list. Kept in localStorage: these are
 * per-device conveniences, so losing them (private mode, cleared data) is acceptable.
 */
import { useEffect, useState } from 'preact/hooks';

export type PinKind = 'query' | 'card' | 'codex' | 'faq' | 'rule';

export interface Pin {
  kind: PinKind;
  /** Search text for queries, otherwise the app route (e.g. /card/sir_lancelot). */
  key: string;
  title: string;
}

const PINS_KEY = 'pins';
const RECENT_KEY = 'recent-searches';
export const RECENT_MAX = 5;

function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '') as T;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

let pins: Pin[] = read<Pin[]>(PINS_KEY, []);
let recent: string[] = read<string[]>(RECENT_KEY, []).slice(0, RECENT_MAX);
const subs = new Set<() => void>();
const emit = () => subs.forEach((fn) => fn());

const sameQuery = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const samePin = (a: Pin, kind: PinKind, key: string) => a.kind === kind && (kind === 'query' ? sameQuery(a.key, key) : a.key === key);

export const isPinned = (kind: PinKind, key: string) => pins.some((p) => samePin(p, kind, key));

export function togglePin(pin: Pin) {
  pins = isPinned(pin.kind, pin.key) ? pins.filter((p) => !samePin(p, pin.kind, pin.key)) : [pin, ...pins];
  // A pinned query no longer needs a slot in Recent.
  if (pin.kind === 'query') recent = recent.filter((r) => !sameQuery(r, pin.key));
  write(PINS_KEY, pins);
  write(RECENT_KEY, recent);
  emit();
}

export function addRecent(q: string) {
  const t = q.trim();
  if (t.length < 2 || isPinned('query', t)) return;
  recent = [t, ...recent.filter((r) => !sameQuery(r, t))].slice(0, RECENT_MAX);
  write(RECENT_KEY, recent);
  emit();
}

export function clearRecent() {
  recent = [];
  write(RECENT_KEY, recent);
  emit();
}

/** Re-renders the caller whenever pins or recent searches change. */
export function usePins() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    subs.add(fn);
    return () => void subs.delete(fn);
  }, []);
  return { pins, recent };
}
