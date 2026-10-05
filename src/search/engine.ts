import MiniSearch, { type SearchResult } from 'minisearch';
import { blocksText, getStore } from '../data';

export type DocType = 'card' | 'codex' | 'faq' | 'rule';

export interface Doc {
  id: string;
  type: DocType;
  /** Route to open, e.g. /card/apprentice_wizard */
  href: string;
  title: string;
  kw: string;
  body: string;
  /** Short label shown under the title (type line, chapter, …). */
  sub: string;
}

export interface Hit {
  doc: Doc;
  score: number;
  terms: string[];
}

let engine: MiniSearch<Doc> | null = null;
const docs = new Map<string, Doc>();

export function normalize(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’‘]/g, "'")
    .toLowerCase();
}

const STOP = new Set(['a', 'an', 'the', 'of', 'to', 'in', 'on', 'is', 'it', 'and', 'or', 'can', 'does', 'do', 'if', 'i', 'my', 'with', 'for', 'at', 'be', 'by', 'what', 'how', 'when', 'that', 'this']);

function buildDocs(): Doc[] {
  const s = getStore();
  const out: Doc[] = [];
  for (const c of s.db.cards) {
    out.push({
      id: `c:${c.slug}`,
      type: 'card',
      href: `/card/${c.slug}`,
      title: c.name,
      kw: [c.type, ...c.subtypes, ...c.keywords, c.typeline, ...c.elements, c.rarity ?? ''].join(' '),
      body: c.rules,
      sub: c.typeline || c.type,
    });
  }
  for (const e of s.db.codex) {
    out.push({
      id: `x:${e.id}`,
      type: 'codex',
      href: `/codex/${e.id}`,
      title: e.title,
      kw: [...e.aliases, ...e.subs.map((x) => x.title)].join(' '),
      body: blocksText(e.blocks),
      sub: 'Codex',
    });
    for (const sub of e.subs) {
      out.push({
        id: `x:${e.id}/${sub.id}`,
        type: 'codex',
        href: `/codex/${e.id}/${sub.id}`,
        title: sub.title,
        kw: e.title,
        body: blocksText(sub.blocks),
        sub: `Codex · ${e.title}`,
      });
    }
  }
  for (const f of s.db.faqs) {
    const names = f.cards.map((slug) => s.cards.get(slug)?.name ?? '').join(', ');
    out.push({ id: `f:${f.id}`, type: 'faq', href: `/faq/${f.id}`, title: f.q, kw: names, body: blocksText(f.a), sub: names ? `FAQ · ${names}` : 'FAQ' });
  }
  for (const r of s.db.rules) {
    out.push({
      id: `r:${r.id}`,
      type: 'rule',
      href: `/rule/${r.id}`,
      title: r.title,
      kw: r.chapter,
      body: r.paras.join('\n').replace(/^## /gm, ''),
      sub: r.chapter && r.chapter !== r.title ? `Rulebook · ${r.chapter} · p. ${r.page}` : `Rulebook · p. ${r.page}`,
    });
  }
  return out;
}

export function initSearch(): void {
  if (engine) return;
  engine = new MiniSearch<Doc>({
    fields: ['title', 'kw', 'body'],
    storeFields: [],
    processTerm: (term) => {
      const t = normalize(term);
      return t.length > 1 || /\d/.test(t) ? t : null;
    },
    searchOptions: {
      boost: { title: 4, kw: 2, body: 1 },
      prefix: (term, i, terms) => i === terms.length - 1 || term.length > 3,
      fuzzy: (term) => (term.length >= 5 ? 0.2 : term.length >= 4 ? 1 : false),
      processTerm: (term) => {
        const t = normalize(term);
        return t.length > 1 && !STOP.has(t) ? t : null;
      },
    },
  });
  const all = buildDocs();
  for (const d of all) docs.set(d.id, d);
  engine.addAll(all);
}

const TYPE_WEIGHT: Record<DocType, number> = { card: 1.15, codex: 1.25, faq: 0.85, rule: 0.9 };

export function search(query: string, type?: DocType, limit = 200): Hit[] {
  if (!engine) initSearch();
  const q = query.trim();
  if (!q) return [];
  const nq = normalize(q);
  const filter = type ? (r: SearchResult) => docs.get(r.id)!.type === type : undefined;
  let results = engine!.search(q, { combineWith: 'AND', filter });
  if (results.length < 5) {
    const seen = new Set(results.map((r) => r.id));
    results = results.concat(engine!.search(q, { combineWith: 'OR', filter }).filter((r) => !seen.has(r.id)).map((r) => ({ ...r, score: r.score * 0.5 })));
  }
  return results
    .map((r) => {
      const doc = docs.get(r.id)!;
      const title = normalize(doc.title);
      let score = r.score * TYPE_WEIGHT[doc.type];
      if (title === nq) score *= 6;
      else if (title.startsWith(nq)) score *= 2.5;
      else if (doc.type === 'codex' && doc.kw.split(' ').includes(nq)) score *= 3;
      return { doc, score, terms: r.terms };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function getDoc(id: string): Doc | undefined {
  return docs.get(id);
}

/** Text excerpt around the first matched term, for result rows. */
export function snippet(body: string, terms: string[], max = 140): string {
  const flat = body.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const lower = normalize(flat);
  let at = -1;
  for (const t of terms) {
    const i = lower.indexOf(t);
    if (i >= 0 && (at < 0 || i < at)) at = i;
  }
  if (at < 0) return `${flat.slice(0, max).replace(/\s+\S*$/, '')}…`;
  const start = Math.max(0, at - 40);
  const s = flat.slice(start, start + max).replace(/\s+\S*$/, '');
  return `${start > 0 ? '…' : ''}${start > 0 ? s.replace(/^\S*\s/, '') : s}…`;
}
