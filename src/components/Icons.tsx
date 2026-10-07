import type { JSX } from 'preact';

type P = JSX.SVGAttributes<SVGSVGElement>;

const base = (props: P, children: JSX.Element | JSX.Element[], vb = '0 0 24 24') => (
  <svg viewBox={vb} width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" {...props}>
    {children}
  </svg>
);

export const SearchIcon = (p: P) => base(p, [<circle cx="11" cy="11" r="7" />, <path d="m20 20-3.5-3.5" />]);
export const CardsIcon = (p: P) =>
  base(p, [<rect x="3" y="5" width="12" height="16" rx="2" />, <path d="M8 3h11a2 2 0 0 1 2 2v13" />]);
export const CodexIcon = (p: P) =>
  base(p, [<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z" />, <path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20v-3" />, <path d="M9 8h7M9 11.5h5" />]);
export const RulesIcon = (p: P) =>
  base(p, [<path d="M12 6c-2-1.5-5-2-8-1.5v14c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-14c-3-.5-6 0-8 1.5z" />, <path d="M12 6v14" />]);
export const MoreIcon = (p: P) =>
  base(p, [<circle cx="12" cy="12" r="3" />, <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />]);
export const ChevronLeft = (p: P) => base({ 'stroke-width': 2.6, ...p }, <path d="m15 5-7 7 7 7" />);
export const ChevronRight = (p: P) => base(p, <path d="m9 5 7 7-7 7" />);
export const ChevronDown = (p: P) => base(p, <path d="m6 9 6 6 6-6" />);
export const CloseIcon = (p: P) => base(p, [<path d="M6 6l12 12M18 6 6 18" />]);
export const ClockIcon = (p: P) => base(p, [<circle cx="12" cy="12" r="9" />, <path d="M12 7v5l3 2" />]);
export const SparkIcon = (p: P) => base(p, <path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z" />);
export const ExternalIcon = (p: P) => base(p, [<path d="M14 4h6v6" />, <path d="M20 4l-9 9" />, <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />]);
export const ShareIcon = (p: P) => base(p, [<path d="M12 3v12" />, <path d="m7 8 5-5 5 5" />, <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />]);

export type Element = 'air' | 'earth' | 'fire' | 'water';
export const ELEMENTS: Element[] = ['air', 'earth', 'fire', 'water'];

export function ElementGlyph({ el, size = 14 }: { el: Element; size?: number }) {
  const up = el === 'air' || el === 'fire';
  const bar = el === 'air' || el === 'earth';
  return (
    <svg class={`el el-${el}`} viewBox="0 0 20 20" width={size} height={size} aria-label={el} role="img">
      <path d={up ? 'M10 2.5 18 17H2z' : 'M10 17.5 2 3h16z'} fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" />
      {bar && <path d={up ? 'M5.3 11.5h9.4' : 'M5.3 8.5h9.4'} stroke="currentColor" stroke-width="2.2" />}
    </svg>
  );
}

export const PinIcon = ({ filled, ...p }: P & { filled?: boolean }) =>
  base({ fill: filled ? 'currentColor' : 'none', ...p }, [<path d="M9 3h6l-1 6 4 4v2h-5v6l-1 1-1-1v-6H6v-2l4-4z" />]);

export function AppLogo() {
  const star = Array.from({ length: 8 }, (_, i) => {
    const a = ((-90 + i * 45) * Math.PI) / 180;
    const r = i % 2 === 0 ? 17 : 3.6;
    return `${(20 + r * Math.cos(a)).toFixed(2)},${(20 + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
  return (
    <svg class="app-logo" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="18.5" fill="none" stroke="currentColor" stroke-opacity=".55" stroke-width="1.4" />
      <polygon points={star} fill="currentColor" />
      <circle cx="20" cy="20" r="2.4" fill="var(--bg)" />
    </svg>
  );
}

export const MailIcon = (p: P) => base(p, [<rect x="3" y="5" width="18" height="14" rx="2" />, <path d="m4 7 8 6 8-6" />]);
