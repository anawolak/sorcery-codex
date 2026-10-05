import type { ComponentChildren } from 'preact';
import { MARKUP, getStore, resolveLink } from '../data';
import { normalize } from '../search/engine';
import type { Block, Span } from '../types';
import { openTermSheet } from './Sheet';

/** Turns source link markup into links to cards / codex entries (see MARKUP). */
function linkify(text: string, key: string): ComponentChildren[] {
  const out: ComponentChildren[] = [];
  let last = 0;
  for (const m of text.matchAll(MARKUP)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    const label = m[1] ?? m[2] ?? m[3];
    const href = m[3] ? null : resolveLink(label, !!m[2]);
    if (href?.startsWith('/codex/') && href.split('/').length === 3) {
      const id = href.split('/')[2];
      out.push(
        <button key={`${key}-${m.index}`} type="button" class="term-link" onClick={() => openTermSheet(id)}>
          {label}
        </button>,
      );
    } else if (href) {
      out.push(
        <a key={`${key}-${m.index}`} href={`#${href}`} class="ref-link">
          {label}
        </a>,
      );
    } else out.push(label);
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function SpanView({ s, k }: { s: Span; k: string }) {
  let node: ComponentChildren = linkify(s.x, k);
  if (s.i) node = <em>{node}</em>;
  if (s.b) node = <strong>{node}</strong>;
  return <>{node}</>;
}

function Grid({ grid }: { grid: string[][] }) {
  return (
    <div class="dmg-grid" style={{ gridTemplateColumns: `repeat(${grid[0]?.length ?? 1}, 1fr)` }} aria-label="Damage grid">
      {grid.flatMap((row, r) => row.map((cell, c) => <span key={`${r}-${c}`} class={cell.trim() ? 'on' : ''}>{cell.trim() && cell !== 'X' ? cell : ''}</span>))}
    </div>
  );
}

export function RichText({ blocks }: { blocks: Block[] }) {
  const out: ComponentChildren[] = [];
  let list: { ord: boolean; items: ComponentChildren[] } | null = null;
  const flush = () => {
    if (list) out.push(list.ord ? <ol key={`l${out.length}`}>{list.items}</ol> : <ul key={`l${out.length}`}>{list.items}</ul>);
    list = null;
  };
  blocks.forEach((b, i) => {
    if (b.t === 'li') {
      if (!list || list.ord !== !!b.ord) {
        flush();
        list = { ord: !!b.ord, items: [] };
      }
      list.items.push(
        <li key={i} class={b.lvl > 1 ? 'nested' : undefined}>
          {b.spans.map((s, j) => <SpanView key={j} s={s} k={`${i}-${j}`} />)}
        </li>,
      );
      return;
    }
    flush();
    if (b.t === 'grid') out.push(<Grid key={i} grid={b.grid} />);
    else if (b.t === 'h') out.push(<h3 key={i}>{b.spans.map((s, j) => <SpanView key={j} s={s} k={`${i}-${j}`} />)}</h3>);
    else out.push(<p key={i}>{b.spans.map((s, j) => <SpanView key={j} s={s} k={`${i}-${j}`} />)}</p>);
  });
  flush();
  return <div class="rich">{out}</div>;
}

const reCache = new Map<string, RegExp>();
function aliasRegex(ids: string[]): RegExp | null {
  const key = ids.join('|');
  if (reCache.has(key)) return reCache.get(key)!;
  const s = getStore();
  const alts = ids
    .flatMap((id) => s.codex.get(id)?.aliases ?? [])
    .filter((a) => a.length >= 3)
    .sort((a, b) => b.length - a.length)
    .map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['’]"));
  const re = alts.length ? new RegExp(`(?<![\\p{L}\\p{N}])(${alts.join('|')})(?![\\p{L}\\p{N}])`, 'giu') : null;
  reCache.set(key, re!);
  return re;
}

/**
 * Plain text (card rules, rulebook paragraphs) with the given codex terms made tappable.
 * `once` links only the first occurrence of each term (for long prose).
 */
export function TermText({ text, terms, once = false, seen }: { text: string; terms: string[]; once?: boolean; seen?: Set<string> }) {
  const s = getStore();
  // Generic terms ("minion", "site") would underline half of every sentence.
  terms = terms.filter((id) => !s.codex.get(id)?.generic);
  const re = aliasRegex(terms);
  if (!re) return <>{text}</>;
  const aliasToId = new Map<string, string>();
  for (const id of terms) for (const a of s.codex.get(id)?.aliases ?? []) aliasToId.set(normalize(a), id);
  const used = seen ?? new Set<string>();
  const out: ComponentChildren[] = [];
  let last = 0;
  re.lastIndex = 0;
  for (const m of text.matchAll(re)) {
    const id = aliasToId.get(normalize(m[0]));
    if (!id || (once && used.has(id))) continue;
    used.add(id);
    if (m.index! > last) out.push(text.slice(last, m.index));
    out.push(
      <button key={m.index} type="button" class="term-link" onClick={() => openTermSheet(id)}>
        {m[0]}
      </button>,
    );
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
