import { useEffect, useRef, useState } from 'preact/hooks';
import { CloseIcon } from './Icons';

/**
 * Fullscreen card image with pinch-to-zoom, pan, double-tap zoom and swipe-down to close.
 * Shows the offline image immediately and swaps in the high-resolution original when online.
 */
export function ImageViewer({ src, hiRes, alt, onClose }: { src: string; hiRes?: string; alt: string; onClose: () => void }) {
  const img = useRef<HTMLImageElement>(null);
  const [current, setCurrent] = useState(src);
  const [closing, setClosing] = useState(false);
  const t = useRef({ scale: 1, x: 0, y: 0 });
  const g = useRef<{ mode: 'pan' | 'pinch' | 'dismiss' | null; d0: number; s0: number; x0: number; y0: number; px: number; py: number; moved: boolean; lastTap: number }>({
    mode: null, d0: 0, s0: 1, x0: 0, y0: 0, px: 0, py: 0, moved: false, lastTap: 0,
  });

  useEffect(() => {
    if (!hiRes || !navigator.onLine) return;
    const pre = new Image();
    pre.onload = () => setCurrent(hiRes);
    pre.src = hiRes;
  }, [hiRes]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    document.documentElement.classList.add('sheet-open');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.documentElement.classList.remove('sheet-open');
    };
  }, []);

  const apply = (animate = false, fade = 1) => {
    const el = img.current;
    if (!el) return;
    el.style.transition = animate ? 'transform .25s ease, opacity .25s ease' : 'none';
    el.style.transform = `translate(${t.current.x}px, ${t.current.y}px) scale(${t.current.scale})`;
    (el.parentElement as HTMLElement).style.backgroundColor = `rgba(0,0,0,${0.94 * fade})`;
  };

  const close = () => {
    setClosing(true);
    setTimeout(onClose, 200);
  };

  const dist = (e: TouchEvent) => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);

  const onStart = (e: TouchEvent) => {
    const s = g.current;
    s.moved = false;
    if (e.touches.length === 2) {
      s.mode = 'pinch';
      s.d0 = dist(e);
      s.s0 = t.current.scale;
    } else if (e.touches.length === 1) {
      s.mode = t.current.scale > 1.01 ? 'pan' : 'dismiss';
      s.px = e.touches[0].clientX;
      s.py = e.touches[0].clientY;
      s.x0 = t.current.x;
      s.y0 = t.current.y;
    }
  };

  const onMove = (e: TouchEvent) => {
    const s = g.current;
    e.preventDefault();
    s.moved = true;
    if (s.mode === 'pinch' && e.touches.length === 2) {
      t.current.scale = Math.min(5, Math.max(1, (s.s0 * dist(e)) / s.d0));
      apply();
    } else if (s.mode === 'pan' && e.touches.length === 1) {
      t.current.x = s.x0 + e.touches[0].clientX - s.px;
      t.current.y = s.y0 + e.touches[0].clientY - s.py;
      apply();
    } else if (s.mode === 'dismiss' && e.touches.length === 1) {
      t.current.y = e.touches[0].clientY - s.py;
      t.current.x = (e.touches[0].clientX - s.px) * 0.3;
      apply(false, Math.max(0.2, 1 - Math.abs(t.current.y) / 400));
    }
  };

  const onEnd = (e: TouchEvent) => {
    const s = g.current;
    if (e.touches.length) return;
    if (s.mode === 'dismiss') {
      if (Math.abs(t.current.y) > 120) return close();
      t.current = { scale: 1, x: 0, y: 0 };
      apply(true);
    } else if (t.current.scale <= 1.01) {
      t.current = { scale: 1, x: 0, y: 0 };
      apply(true);
    }
    if (!s.moved) {
      const now = Date.now();
      if (now - s.lastTap < 280) {
        t.current = t.current.scale > 1.01 ? { scale: 1, x: 0, y: 0 } : { scale: 2.5, x: 0, y: 0 };
        apply(true);
        s.lastTap = 0;
      } else {
        s.lastTap = now;
      }
    }
    s.mode = null;
  };

  return (
    <div class={`viewer${closing ? ' closing' : ''}`} role="dialog" aria-modal="true" aria-label={alt} onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd} onClick={(e) => e.target === e.currentTarget && close()}>
      <img ref={img} src={current} alt={alt} draggable={false} />
      <button type="button" class="viewer-close" aria-label="Close" onClick={close}>
        <CloseIcon width={18} height={18} />
      </button>
    </div>
  );
}
