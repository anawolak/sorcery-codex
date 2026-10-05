import type { Block, Card, CodexEntry, DB, Faq, RuleSection } from './types';

export const IMAGE_CDN = 'https://d27a44hjr9gen3.cloudfront.net/cards';

export interface Store {
  db: DB;
  cards: Map<string, Card>;
  codex: Map<string, CodexEntry>;
  faqs: Map<string, Faq>;
  rules: Map<string, RuleSection>;
  cardByName: Map<string, Card>;
  codexByTitle: Map<string, CodexEntry>;
}

let store: Store | null = null;

export async function loadStore(): Promise<Store> {
  if (store) return store;
  const res = await fetch('data/db.json');
  if (!res.ok) throw new Error(`Could not load data (${res.status})`);
  const db: DB = await res.json();
  store = {
    db,
    cards: new Map(db.cards.map((c) => [c.slug, c])),
    codex: new Map(db.codex.map((c) => [c.id, c])),
    faqs: new Map(db.faqs.map((f) => [f.id, f])),
    rules: new Map(db.rules.map((r) => [r.id, r])),
    cardByName: new Map(db.cards.map((c) => [c.name.toLowerCase(), c])),
    codexByTitle: new Map(db.codex.map((c) => [c.title.toLowerCase(), c])),
  };
  return store;
}

export function getStore(): Store {
  if (!store) throw new Error('Store not loaded');
  return store;
}

export const cardImage = (c: Card) => `cards/${c.img}.webp`;
export const printingImage = (slug: string) => `${IMAGE_CDN}/${slug}.png`;

export const MARKUP = /\[\[([^\]]+)\]\]|\(\(([^()]+)\)\)|\)\)([^()]+)\(\(/g;

let termIndex: Map<string, string> | null = null;

export function resolveLink(name: string, preferTerm = false): string | null {
  const s = getStore();
  const key = name.trim().toLowerCase();
  if (!termIndex) {
    termIndex = new Map();
    for (const e of s.db.codex) {
      for (const sub of e.subs) termIndex.set(sub.title.toLowerCase(), `/codex/${e.id}/${sub.id}`);
      for (const a of e.aliases) termIndex.set(a, `/codex/${e.id}`);
      termIndex.set(e.title.toLowerCase(), `/codex/${e.id}`);
    }
  }
  const card = s.cardByName.get(key);
  const term = termIndex.get(key) ?? termIndex.get(key.replace(/s$/, ''));
  if (preferTerm && term) return term;
  if (card) return `/card/${card.slug}`;
  return term ?? null;
}

export function plain(text: string): string {
  return text.replace(MARKUP, (_m, a, b, c) => a ?? b ?? c);
}

export function blocksText(blocks: Block[]): string {
  return blocks.map((b) => (b.t === 'grid' ? '' : plain(b.spans.map((s) => s.x).join('')))).join('\n');
}

export function firstParagraph(blocks: Block[], max = 220): string {
  const b = blocks.find((x) => x.t === 'p') ?? blocks[0];
  if (!b || b.t === 'grid') return '';
  const t = plain(b.spans.map((s) => s.x).join(''));
  return t.length > max ? `${t.slice(0, max).replace(/\s+\S*$/, '')}…` : t;
}
