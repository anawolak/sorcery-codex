import { useEffect, useRef, useState } from 'preact/hooks';
import { getStore } from '../data';
import { navigate } from '../router';
import { ChevronRight } from './Icons';
import { RichText } from './RichText';

let setTermId: ((id: string | null) => void) | null = null;

/** Quick definition peek, e.g. when tapping a keyword in card text mid-game. */
export function openTermSheet(id: string) {
  setTermId?.(id);
}

export function SheetHost() {
  const [id, setId] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);
  setTermId = (next) => {
    setClosing(false);
    setId(next);
  };

  const close = () => {
    setClosing(true);
    setTimeout(() => {
      setId(null);
      setClosing(false);
    }, 220);
  };

  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    document.documentElement.classList.add('sheet-open');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.documentElement.classList.remove('sheet-open');
    };
  }, [id]);

  if (!id) return null;
  const entry = getStore().codex.get(id);
  if (!entry) return null;

  const onTouchStart = (e: TouchEvent) => {
    const scroller = panel.current!.querySelector('.sheet-body') as HTMLElement;
    if (scroller.scrollTop > 0 && !(e.target as Element).closest('.sheet-grabber')) return;
    drag.current = { y: e.touches[0].clientY, dy: 0 };
  };
  const onTouchMove = (e: TouchEvent) => {
    if (!drag.current) return;
    const dy = Math.max(0, e.touches[0].clientY - drag.current.y);
    drag.current.dy = dy;
    panel.current!.style.transform = `translateY(${dy}px)`;
    panel.current!.style.transition = 'none';
  };
  const onTouchEnd = () => {
    if (!drag.current) return;
    const { dy } = drag.current;
    drag.current = null;
    panel.current!.style.transition = '';
    panel.current!.style.transform = '';
    if (dy > 110) close();
  };

  return (
    <div class={`sheet-wrap${closing ? ' closing' : ''}`} role="dialog" aria-modal="true" aria-label={entry.title}>
      <div class="sheet-backdrop" onClick={close} />
      <div class="sheet" ref={panel} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <div class="sheet-grabber" />
        <div class="sheet-head">
          <span class="eyebrow">Codex</span>
          <h2 class="serif">{entry.title}</h2>
        </div>
        <div class="sheet-body">
          <RichText blocks={entry.blocks} />
          {entry.subs.length > 0 && (
            <p class="muted small">
              + {entry.subs.length} more section{entry.subs.length > 1 ? 's' : ''}: {entry.subs.map((s) => s.title).join(', ')}
            </p>
          )}
        </div>
        <button
          type="button"
          class="sheet-cta"
          onClick={() => {
            setId(null);
            navigate(`/codex/${entry.id}`);
          }}
        >
          Open full entry
          {entry.faqs.length > 0 && ` · ${entry.faqs.length} FAQ`}
          <ChevronRight width={18} height={18} />
        </button>
      </div>
    </div>
  );
}
