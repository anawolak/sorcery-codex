/**
 * Tiny hash router with an iOS-style navigation stack:
 *  - history.state.idx tells push from pop, so transitions slide the right way
 *  - scroll position is remembered per history entry
 *  - route changes render synchronously inside document.startViewTransition when available
 */

export type Tab = 'search' | 'cards' | 'codex' | 'rules' | 'more';
export type NavDir = 'push' | 'pop' | 'tab' | 'none';

export interface Route {
  path: string;
  parts: string[];
  query: URLSearchParams;
}

export const TAB_ROOTS: Record<Tab, string> = { search: '/', cards: '/cards', codex: '/codex', rules: '/rules', more: '/more' };

let route: Route = parse();
let idx = 0;
let tab: Tab = tabFor(route) ?? 'search';
let listener: (() => void) | null = null;
let skipNextTransition = false;
const scrolls = new Map<number, number>();

function parse(): Route {
  const raw = decodeURI(location.hash.replace(/^#/, '')) || '/';
  const [path, qs = ''] = raw.split('?');
  return { path, parts: path.split('/').filter(Boolean), query: new URLSearchParams(qs) };
}

function tabFor(r: Route): Tab | null {
  for (const [t, p] of Object.entries(TAB_ROOTS) as [Tab, string][]) if (r.path === p) return t;
  return null;
}

export const currentRoute = () => route;
export const currentTab = () => tab;
export const isRoot = () => tabFor(route) !== null;
export const canGoBack = () => idx > 0;

export function onRouteChange(fn: () => void) {
  listener = fn;
}

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function apply(dir: NavDir) {
  route = parse();
  tab = tabFor(route) ?? tab;
  const run = () => {
    listener?.();
    window.scrollTo(0, dir === 'pop' ? (scrolls.get(idx) ?? 0) : 0);
  };
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (doc.startViewTransition && dir !== 'none' && !skipNextTransition && !reducedMotion()) {
    document.documentElement.dataset.nav = dir;
    doc.startViewTransition(run);
  } else {
    run();
  }
  skipNextTransition = false;
}

export function navigate(path: string, opts: { replace?: boolean; dir?: NavDir } = {}) {
  if (opts.replace) {
    history.replaceState({ idx }, '', `#${path}`);
    apply(opts.dir ?? 'none');
    return;
  }
  scrolls.set(idx, window.scrollY);
  idx++;
  history.pushState({ idx }, '', `#${path}`);
  apply(opts.dir ?? 'push');
}

/** Update the URL query of the current entry without re-rendering (e.g. while typing). */
export function setQueryParam(key: string, value: string) {
  const q = new URLSearchParams(route.query);
  if (value) q.set(key, value);
  else q.delete(key);
  const qs = q.toString();
  history.replaceState({ idx }, '', `#${route.path}${qs ? `?${qs}` : ''}`);
  route = parse();
}

export function back(opts: { animate?: boolean } = {}) {
  if (opts.animate === false) skipNextTransition = true;
  if (idx > 0) history.back();
  else navigate(TAB_ROOTS[tab], { replace: true, dir: 'pop' });
}

export function selectTab(t: Tab) {
  if (t === tab && isRoot()) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  navigate(TAB_ROOTS[t], { dir: 'tab' });
}

export function initRouter() {
  history.replaceState({ idx: 0 }, '', location.hash || '#/');
  route = parse();
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  window.addEventListener('popstate', (e) => {
    const next = (e.state?.idx as number | undefined) ?? 0;
    scrolls.set(idx, window.scrollY);
    const dir: NavDir = next < idx ? 'pop' : 'push';
    idx = next;
    apply(dir);
  });

  // Intercept in-app links so they use pushState navigation.
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
    const a = (e.target as Element).closest?.('a[href^="#/"]');
    if (!a) return;
    e.preventDefault();
    navigate(a.getAttribute('href')!.slice(1));
  });
}
