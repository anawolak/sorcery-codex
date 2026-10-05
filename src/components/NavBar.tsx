import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { back, currentTab } from '../router';
import { ChevronLeft } from './Icons';

const TAB_LABEL = { search: 'Search', cards: 'Cards', codex: 'Codex', rules: 'Rulebook', more: 'More' } as const;

export function useScrolled(threshold = 44) {
  const [scrolled, setScrolled] = useState(() => window.scrollY > threshold);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > threshold);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [threshold]);
  return scrolled;
}

export function NavBar({ title, right }: { title: string; right?: ComponentChildren }) {
  const scrolled = useScrolled(56);
  return (
    <header class={`navbar${scrolled ? ' scrolled' : ''}`}>
      <button type="button" class="nav-back" onClick={() => back()} aria-label="Back">
        <ChevronLeft width={22} height={22} />
        <span>{TAB_LABEL[currentTab()]}</span>
      </button>
      <div class="nav-title">{title}</div>
      <div class="nav-right">{right}</div>
    </header>
  );
}

export function LargeTitle({ title, children }: { title: string; children?: ComponentChildren }) {
  const scrolled = useScrolled(40);
  return (
    <>
      <header class={`navbar root${scrolled ? ' scrolled' : ''}`}>
        <div class="nav-title">{title}</div>
      </header>
      <div class="large-title">
        <h1 class="serif">{title}</h1>
        {children}
      </div>
    </>
  );
}
