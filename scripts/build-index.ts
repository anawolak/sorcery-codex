import crypto from 'node:crypto';
import path from 'node:path';
import type { Card, CodexEntry, DB, Faq, Printing, RuleSection } from '../src/types';
import { MARKUP, OUT, RAW, blocksToText, portableToBlocks, readJson, slugify, writeJson } from './lib';

const CODEX_CARD_CAP = 60;
const CODEX_FAQ_CAP = 40;
const CODEX_RULE_CAP = 6;
const RULE_TERM_CAP = 12;

const rawCards = readJson<any[]>(path.join(RAW, 'cards.json'));
const rawCodex = readJson<any[]>(path.join(RAW, 'codex.json'));
const rawFaq = readJson<any[]>(path.join(RAW, 'faq.json'));
const rawRules = readJson<{ sections: any[] }>(path.join(RAW, 'rules.json'));

const PRODUCT_RANK: Record<string, number> = { Booster: 0, PreconstructedDeck: 1, BoxTopper: 2 };

function primaryPrinting(printings: any[]): any {
  return [...printings].sort((a, b) => {
    const std = Number(a.meta.finish !== 'Standard') - Number(b.meta.finish !== 'Standard');
    if (std) return std;
    const promo = Number(a.set.name === 'Promo') - Number(b.set.name === 'Promo');
    if (promo) return promo;
    const prod = (PRODUCT_RANK[a.meta.product] ?? 5) - (PRODUCT_RANK[b.meta.product] ?? 5);
    if (prod) return prod;
    return Date.parse(b.set.releasedAt) - Date.parse(a.set.releasedAt);
  })[0];
}

const cards: Card[] = rawCards.map((c) => {
  const e = c.engine;
  const main = primaryPrinting(c.printings);
  const printings: Printing[] = c.printings.map((p: any) => ({
    slug: p.slug,
    set: p.set.name,
    finish: p.meta.finish,
    product: p.meta.product,
  }));
  return {
    slug: c.slug,
    name: c.name,
    type: e.type,
    category: e.category,
    rarity: e.rarity ?? null,
    rules: (e.rules ?? '').trim(),
    cost: e.cost ?? null,
    attack: e.attack ?? null,
    defense: e.defense ?? null,
    life: e.life ?? null,
    th: [e.air ?? 0, e.earth ?? 0, e.fire ?? 0, e.water ?? 0],
    elements: (e.elements ?? []).filter((x: string) => x !== 'None'),
    subtypes: e.subtypes ?? [],
    keywords: e.keywords ?? [],
    typeline: main?.meta.typeline ?? '',
    flavor: main?.meta.flavor ?? null,
    artist: main?.meta.artist?.name ?? null,
    sets: [...new Set<string>(c.printings.map((p: any) => p.set.name))],
    img: main?.slug ?? '',
    printings,
    terms: [],
    faqs: [],
    mentions: [],
  };
});
cards.sort((a, b) => a.name.localeCompare(b.name));
const cardByName = new Map(cards.map((c) => [c.name.toLowerCase(), c]));
const cardBySlug = new Map(cards.map((c) => [c.slug, c]));

const codex: CodexEntry[] = rawCodex.map((x) => {
  const aliases = new Set<string>([x.title.toLowerCase()]);
  for (const a of String(x.finder ?? '').split(',')) if (a.trim()) aliases.add(a.trim().toLowerCase());
  return {
    id: slugify(x.title),
    title: x.title,
    aliases: [...aliases],
    blocks: portableToBlocks(x.content),
    subs: (x.subcodexes ?? []).map((s: any) => ({ id: slugify(s.title), title: s.title, blocks: portableToBlocks(s.content) })),
    updated: x._updatedAt,
    cards: [],
    cardCount: 0,
    faqs: [],
    rules: [],
    see: [],
    ...({ _link: x.interlinking !== false } as object),
  } as CodexEntry;
});
codex.sort((a, b) => a.title.localeCompare(b.title));
const codexByTitle = new Map(codex.map((c) => [c.title.toLowerCase(), c]));

interface Alias {
  re: RegExp;
  id: string;
  len: number;
}
const aliases: Alias[] = codex
  .filter((c) => (c as any)._link)
  .flatMap((c) =>
    c.aliases.map((a) => ({
      id: c.id,
      len: a.length,
      re: new RegExp(`(?<![\\p{L}\\p{N}])${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/['’]/g, "['’]")}(?![\\p{L}\\p{N}])`, 'giu'),
    })),
  )
  .sort((a, b) => b.len - a.len);

function findTerms(text: string): Map<string, number> {
  const taken: boolean[] = [];
  const found = new Map<string, number>();
  for (const a of aliases) {
    for (const m of text.matchAll(a.re)) {
      const s = m.index!;
      const e = s + m[0].length;
      let free = true;
      for (let i = s; i < e; i++) if (taken[i]) free = false;
      if (!free) continue;
      for (let i = s; i < e; i++) taken[i] = true;
      found.set(a.id, (found.get(a.id) ?? 0) + 1);
    }
  }
  return found;
}

function linkRefs(text: string): string[] {
  return [...text.matchAll(MARKUP)].flatMap((m) => (m[1] ?? m[2] ? [(m[1] ?? m[2]).trim().toLowerCase()] : []));
}

const faqs: Faq[] = [...rawFaq]
  .sort((a, b) => String(a.orderRank ?? '').localeCompare(String(b.orderRank ?? '')))
  .map((f) => {
    const qBlocks = portableToBlocks(f.question);
    const aBlocks = portableToBlocks(f.answer);
    const raw = [...qBlocks, ...aBlocks].flatMap((b) => (b.t === 'grid' ? [] : b.spans.map((s) => s.x))).join(' ');
    const own = (f.cards ?? []).filter((s: string) => cardBySlug.has(s));
    const refs = [...new Set(linkRefs(raw).map((n) => cardByName.get(n)?.slug).filter((s): s is string => !!s && !own.includes(s)))];
    const text = blocksToText(qBlocks) + '\n' + blocksToText(aBlocks);
    return {
      id: f._id,
      q: blocksToText(qBlocks),
      a: aBlocks,
      cards: own,
      terms: [],
      refs,
      ...({ _hits: findTerms(text) } as object),
      updated: f._updatedAt,
    };
  });

const rules: RuleSection[] = [];
for (const s of rawRules.sections) {
  if (/glossary|quick reference/i.test(s.chapter)) continue;
  const prev = rules[rules.length - 1];
  if (prev && (s.title.replace(/[^a-z]/gi, '').length < 3 || !s.paras.length) && s.level > 0) {
    prev.paras.push(...s.paras);
    continue;
  }
  rules.push({ id: s.id, chapter: s.chapter, title: s.title, page: s.page, paras: s.paras, terms: [] });
}

const cardTermHits = new Map<string, Map<string, number>>();
const df = new Map<string, number>();
for (const c of cards) {
  const hits = findTerms([c.rules, c.keywords.join(', '), c.subtypes.join(', ')].join('\n'));
  const typeEntry = codexByTitle.get(c.type.toLowerCase());
  if (typeEntry && !hits.has(typeEntry.id)) hits.set(typeEntry.id, 0);
  cardTermHits.set(c.slug, hits);
  for (const id of hits.keys()) df.set(id, (df.get(id) ?? 0) + 1);
}
const idf = (id: string) => Math.log((cards.length + 1) / ((df.get(id) ?? 0) + 1));

function rank(hits: Map<string, number>, cap = Infinity): string[] {
  return [...hits.entries()]
    .sort((a, b) => b[1] * idf(b[0]) - a[1] * idf(a[0]) || idf(b[0]) - idf(a[0]))
    .slice(0, cap)
    .map(([id]) => id);
}

const codexById = new Map(codex.map((c) => [c.id, c]));
for (const c of cards) {
  const hits = cardTermHits.get(c.slug)!;
  const kw = new Set(c.keywords.map((k) => codexByTitle.get(k.toLowerCase())?.id).filter(Boolean));
  c.terms = [...hits.keys()].sort((a, b) => Number(kw.has(b)) - Number(kw.has(a)) || idf(b) - idf(a));
  for (const id of c.terms) codexById.get(id)!.cardCount++;
}
for (const e of codex) {
  e.cards = cards
    .filter((c) => c.terms.includes(e.id) && (cardTermHits.get(c.slug)!.get(e.id) ?? 0) > 0)
    .slice(0, CODEX_CARD_CAP)
    .map((c) => c.slug);
}

for (const f of faqs) {
  f.terms = rank((f as any)._hits);
  delete (f as any)._hits;
  for (const s of f.cards) cardBySlug.get(s)!.faqs.push(f.id);
  for (const s of f.refs) cardBySlug.get(s)!.mentions.push(f.id);
}

for (const e of codex) {
  const scored: [string, number][] = [];
  for (const f of faqs) {
    if (!f.terms.includes(e.id)) continue;
    const inQ = findTerms(f.q).has(e.id);
    scored.push([f.id, (inQ ? 2 : 1) / (1 + f.terms.indexOf(e.id))]);
  }
  e.faqs = scored.sort((a, b) => b[1] - a[1]).slice(0, CODEX_FAQ_CAP).map(([id]) => id);
}

for (const r of rules) {
  const hits = findTerms(r.title + '\n' + r.paras.join('\n'));
  r.terms = rank(hits, RULE_TERM_CAP);
  const titleHits = findTerms(r.title);
  for (const [id, n] of hits) {
    const e = codexById.get(id)!;
    (e as any)._rules ??= [];
    (e as any)._rules.push([r.id, n + (titleHits.has(id) ? 10 : 0)]);
  }
}
for (const e of codex) {
  const scored: [string, number][] = (e as any)._rules ?? [];
  e.rules = scored.sort((a, b) => b[1] - a[1]).slice(0, CODEX_RULE_CAP).map(([id]) => id);
  const refs = linkRefs([...e.blocks, ...e.subs.flatMap((s) => s.blocks)].flatMap((b) => (b.t === 'grid' ? [] : b.spans.map((s) => s.x))).join(' '));
  e.see = [...new Set(refs.map((n) => codexByTitle.get(n)?.id).filter((id): id is string => !!id && id !== e.id))];
  if (!(e as any)._link || e.cardCount > cards.length * 0.2) e.generic = 1;
  delete (e as any)._rules;
  delete (e as any)._link;
}

const body = { cards, codex, faqs, rules };
const version = crypto.createHash('sha1').update(JSON.stringify(body)).digest('hex').slice(0, 10);
const generated = [...codex.map((c) => c.updated), ...faqs.map((f) => f.updated)].sort().at(-1) ?? '';
const db: DB = { version, generated, ...body };
writeJson(path.join(OUT, 'db.json'), db);

const withTerms = cards.filter((c) => c.terms.length).length;
console.log(
  `db ${version}: ${cards.length} cards (${withTerms} with terms), ${codex.length} codex, ${faqs.length} faqs, ${rules.length} rule sections`,
);
