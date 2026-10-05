import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { ELEMENTS, ElementGlyph, type Element } from '../components/Icons';
import { LargeTitle } from '../components/NavBar';
import { cardImage, getStore } from '../data';
import { normalize } from '../search/engine';
import type { Card } from '../types';

const TYPES = ['Avatar', 'Minion', 'Magic', 'Aura', 'Artifact', 'Site'];
const PAGE = 60;

interface Filters {
  text: string;
  elements: Element[];
  type: string;
  set: string;
  sort: 'name' | 'cost';
}

// Module-level so filters survive navigating into a card and back.
let saved: Filters = { text: '', elements: [], type: '', set: '', sort: 'name' };

const EL_INDEX: Record<Element, number> = { air: 0, earth: 1, fire: 2, water: 3 };

function matches(c: Card, f: Filters, text: string) {
  if (f.type && c.type !== f.type) return false;
  if (f.set && !c.sets.includes(f.set)) return false;
  if (f.elements.length && !f.elements.every((el) => c.th[EL_INDEX[el]] > 0 || c.elements.some((e) => e.toLowerCase() === el))) return false;
  if (text && !normalize(`${c.name} ${c.typeline} ${c.subtypes.join(' ')}`).includes(text)) return false;
  return true;
}

export function CardsView() {
  const s = getStore();
  const [f, setF] = useState<Filters>(saved);
  const [shown, setShown] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);
  const sets = useMemo(() => [...new Set(s.db.cards.flatMap((c) => c.sets))].sort(), []);

  const update = (patch: Partial<Filters>) => {
    saved = { ...f, ...patch };
    setF(saved);
    setShown(PAGE);
  };

  const list = useMemo(() => {
    const text = normalize(f.text.trim());
    const out = s.db.cards.filter((c) => matches(c, f, text));
    if (f.sort === 'cost') out.sort((a, b) => (a.cost ?? 99) - (b.cost ?? 99) || a.name.localeCompare(b.name));
    return out;
  }, [f]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && setShown((n) => n + PAGE), { rootMargin: '800px' });
    io.observe(el);
    return () => io.disconnect();
  }, [list]);

  const toggleEl = (el: Element) => update({ elements: f.elements.includes(el) ? f.elements.filter((x) => x !== el) : [...f.elements, el] });

  return (
    <div class="page">
      <LargeTitle title="Cards">
        <input class="filter-input" type="search" placeholder={`Filter ${s.db.cards.length} cards`} value={f.text} onInput={(e) => update({ text: (e.target as HTMLInputElement).value })} autoCorrect="off" autoCapitalize="off" spellcheck={false} />
        <div class="filters">
          <div class="chips">
            {ELEMENTS.map((el) => (
              <button key={el} type="button" class={`chip el-chip${f.elements.includes(el) ? ' on' : ''}`} onClick={() => toggleEl(el)} aria-pressed={f.elements.includes(el)}>
                <ElementGlyph el={el} size={13} /> {el[0].toUpperCase() + el.slice(1)}
              </button>
            ))}
          </div>
          <div class="chips">
            {TYPES.map((t) => (
              <button key={t} type="button" class={`chip${f.type === t ? ' on' : ''}`} onClick={() => update({ type: f.type === t ? '' : t })} aria-pressed={f.type === t}>
                {t}
              </button>
            ))}
          </div>
          <div class="selects">
            <select value={f.set} onChange={(e) => update({ set: (e.target as HTMLSelectElement).value })} aria-label="Set">
              <option value="">All sets</option>
              {sets.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
            <select value={f.sort} onChange={(e) => update({ sort: (e.target as HTMLSelectElement).value as Filters['sort'] })} aria-label="Sort">
              <option value="name">Sort: Name</option>
              <option value="cost">Sort: Cost</option>
            </select>
            <span class="muted small">{list.length}</span>
          </div>
        </div>
      </LargeTitle>
      <div class="card-grid">
        {list.slice(0, shown).map((c) => (
          <a key={c.slug} href={`#/card/${c.slug}`} class="grid-card" aria-label={c.name}>
            <img src={cardImage(c)} alt={c.name} loading="lazy" decoding="async" />
          </a>
        ))}
      </div>
      {shown < list.length && <div ref={sentinel} class="sentinel" />}
      {!list.length && (
        <div class="empty">
          <p>No cards match these filters.</p>
          <button type="button" class="link-btn" onClick={() => update({ text: '', elements: [], type: '', set: '' })}>
            Reset filters
          </button>
        </div>
      )}
    </div>
  );
}
