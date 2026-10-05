import { useEffect, useState } from 'preact/hooks';
import { CardsIcon, CodexIcon, MoreIcon, RulesIcon, SearchIcon } from './components/Icons';
import { SheetHost } from './components/Sheet';
import { applyUpdate, onUpdateAvailable } from './pwa';
import { type Tab, back, currentRoute, currentTab, isRoot, selectTab } from './router';
import { CardView } from './views/CardView';
import { CardsView } from './views/CardsView';
import { CodexEntryView, CodexIndexView, FaqView } from './views/CodexView';
import { MoreView } from './views/MoreView';
import { NotFound } from './views/NotFound';
import { RuleView, RulesIndexView } from './views/RulesView';
import { SearchView } from './views/SearchView';

function View() {
  const { parts, path } = currentRoute();
  switch (parts[0]) {
    case undefined:
      return <SearchView />;
    case 'cards':
      return <CardsView />;
    case 'codex':
      return parts[1] ? <CodexEntryView key={parts[1]} id={parts[1]} sub={parts[2]} /> : <CodexIndexView />;
    case 'rules':
      return <RulesIndexView />;
    case 'more':
      return <MoreView />;
    case 'card':
      return <CardView key={parts[1]} slug={parts[1]} />;
    case 'rule':
      return <RuleView key={parts[1]} id={parts[1]} />;
    case 'faq':
      return <FaqView key={parts[1]} id={parts[1]} />;
    default:
      return <NotFound key={path} />;
  }
}

const TABS: { tab: Tab; label: string; Icon: typeof SearchIcon }[] = [
  { tab: 'search', label: 'Search', Icon: SearchIcon },
  { tab: 'cards', label: 'Cards', Icon: CardsIcon },
  { tab: 'codex', label: 'Codex', Icon: CodexIcon },
  { tab: 'rules', label: 'Rulebook', Icon: RulesIcon },
  { tab: 'more', label: 'More', Icon: MoreIcon },
];

function TabBar() {
  const active = currentTab();
  return (
    <nav class="tabbar" aria-label="Sections">
      {TABS.map(({ tab, label, Icon }) => (
        <button key={tab} type="button" class={tab === active ? 'on' : ''} aria-current={tab === active ? 'page' : undefined} onClick={() => selectTab(tab)}>
          <Icon width={24} height={24} stroke-width={tab === active ? 2.3 : 1.8} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

const PENDING_KEY = 'update-pending';

function UpdateToast() {
  const [state, setState] = useState<'hidden' | 'available' | 'applying' | 'done'>('hidden');

  useEffect(() => {
    let available = false;
    const off = onUpdateAvailable((v) => {
      available = v;
      if (v) setState((s) => (s === 'applying' ? s : 'available'));
    });
    let pending = false;
    try {
      pending = localStorage.getItem(PENDING_KEY) === '1';
    } catch {}
    let t1: number | undefined;
    let t2: number | undefined;
    if (pending) {
      t1 = window.setTimeout(() => {
        if (available) return;
        try {
          localStorage.removeItem(PENDING_KEY);
        } catch {}
        setState('done');
        t2 = window.setTimeout(() => setState((s) => (s === 'done' ? 'hidden' : s)), 3000);
      }, 2500);
    }
    return () => {
      off();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (state === 'hidden') return null;
  if (state === 'done') {
    return (
      <div class="toast" role="status">
        <span>✓ Updated to the latest cards & rulings</span>
      </div>
    );
  }
  if (state === 'applying') {
    return (
      <div class="toast toast-steps" role="status">
        <div>
          <strong>Almost done</strong>
          <span>Close the app (swipe it away from the app switcher) and open it again to finish the update.</span>
        </div>
        <button type="button" onClick={() => setState('hidden')}>
          OK
        </button>
      </div>
    );
  }
  return (
    <div class="toast" role="status">
      <span>New cards & rulings available</span>
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(PENDING_KEY, '1');
          } catch {}
          setState('applying');
          applyUpdate();
        }}
      >
        Update
      </button>
    </div>
  );
}

function useEdgeSwipeBack() {
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let lastT = 0;
    let lastX = 0;
    let velocity = 0;
    let active = false;
    let decided = false;
    let page: HTMLElement | null = null;

    const start = (e: TouchEvent) => {
      if (isRoot() || e.touches.length !== 1 || document.documentElement.classList.contains('sheet-open')) return;
      const t = e.touches[0];
      if (t.clientX > 28) return;
      active = true;
      decided = false;
      startX = lastX = t.clientX;
      startY = t.clientY;
      lastT = e.timeStamp;
      dx = 0;
      page = document.querySelector('.page');
    };
    const move = (e: TouchEvent) => {
      if (!active || !page) return;
      const t = e.touches[0];
      if (!decided) {
        if (Math.abs(t.clientY - startY) > Math.abs(t.clientX - startX)) {
          active = false;
          return;
        }
        decided = true;
        page.classList.add('swiping');
      }
      e.preventDefault();
      dx = Math.max(0, t.clientX - startX);
      velocity = (t.clientX - lastX) / Math.max(1, e.timeStamp - lastT);
      lastX = t.clientX;
      lastT = e.timeStamp;
      page.style.transform = `translateX(${dx}px)`;
    };
    const end = () => {
      if (!active || !page) return;
      active = false;
      const p = page;
      const w = window.innerWidth;
      p.classList.remove('swiping');
      if (dx > w * 0.35 || (velocity > 0.5 && dx > 30)) {
        p.style.transition = 'transform .2s ease-out';
        p.style.transform = `translateX(${w}px)`;
        setTimeout(() => back({ animate: false }), 180);
      } else {
        p.style.transition = 'transform .25s ease';
        p.style.transform = '';
        setTimeout(() => (p.style.transition = ''), 260);
      }
    };
    document.addEventListener('touchstart', start, { passive: true });
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend', end);
    document.addEventListener('touchcancel', end);
    return () => {
      document.removeEventListener('touchstart', start);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', end);
      document.removeEventListener('touchcancel', end);
    };
  }, []);
}

export function App() {
  useEdgeSwipeBack();
  return (
    <>
      <main class="view">
        <View />
      </main>
      <TabBar />
      <SheetHost />
      <UpdateToast />
    </>
  );
}
