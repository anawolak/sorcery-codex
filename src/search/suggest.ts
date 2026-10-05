import { getStore } from '../data';
import type { Card, CodexEntry, Faq, RuleSection } from '../types';
import { type Hit, normalize } from './engine';

export type Entity = { kind: 'card'; card: Card } | { kind: 'term'; entry: CodexEntry };

export interface Related {
  entities: Entity[];
  faqs: Faq[];
  rules: RuleSection[];
  /** Codex terms related to detected cards that are not themselves detected. */
  terms: CodexEntry[];
}

const MAX_WORDS = 6;
let phraseIndex: Map<string, Entity> | null = null;

/** Phrase → entity, for every card name and every codex title/alias. */
function getPhraseIndex(): Map<string, Entity> {
  if (phraseIndex) return phraseIndex;
  const s = getStore();
  const map = new Map<string, Entity>();
  for (const e of s.db.codex) {
    for (const a of e.aliases) {
      const k = normalize(a);
      if (k.length >= 3 && !map.has(k)) map.set(k, { kind: 'term', entry: e });
    }
  }
  // Card names win over aliases with the same text (e.g. a card literally named like a keyword is rare).
  for (const c of s.db.cards) {
    const k = normalize(c.name);
    if (!map.has(k) || k.split(' ').length > 1) map.set(k, { kind: 'card', card: c });
  }
  phraseIndex = map;
  return map;
}

const WORD = /[\p{L}\p{N}'+-]+/gu;

/** Greedy longest-phrase detection of card names and codex terms inside a free-text query. */
export function detectEntities(query: string): Entity[] {
  const index = getPhraseIndex();
  const words = normalize(query).match(WORD) ?? [];
  const found: Entity[] = [];
  const seen = new Set<string>();
  let i = 0;
  while (i < words.length) {
    let matched = 0;
    for (let n = Math.min(MAX_WORDS, words.length - i); n >= 1; n--) {
      const phrase = words.slice(i, i + n).join(' ');
      const hit = index.get(phrase) ?? index.get(phrase.replace(/s$/, '')) ?? index.get(phrase.replace(/'s$/, ''));
      if (hit) {
        const key = hit.kind === 'card' ? `c:${hit.card.slug}` : `x:${hit.entry.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          found.push(hit);
        }
        matched = n;
        break;
      }
    }
    i += matched || 1;
  }
  // Generic terms ("can", "minion") only matter when nothing more specific was asked about.
  const specific = found.filter((e) => e.kind === 'card' || !e.entry.generic);
  return specific.length ? specific : found.slice(0, 1);
}

/**
 * Builds the "Related" panel for a query: entities named in the query (or, failing that,
 * a clearly dominant top hit), FAQs touching the most of them, and supporting rulebook sections.
 */
export function related(query: string, hits: Hit[]): Related | null {
  const s = getStore();
  let entities = detectEntities(query);

  if (!entities.length && hits.length) {
    const [top, second] = hits;
    const dominant = !second || top.score > second.score * 1.6;
    if (dominant && top.doc.type === 'card') entities = [{ kind: 'card', card: s.cards.get(top.doc.href.split('/')[2])! }];
    if (dominant && top.doc.type === 'codex') entities = [{ kind: 'term', entry: s.codex.get(top.doc.href.split('/')[2])! }];
  }
  if (!entities.length) return null;

  const cardSlugs = entities.flatMap((e) => (e.kind === 'card' ? [e.card.slug] : []));
  const termIds = entities.flatMap((e) => (e.kind === 'term' ? [e.entry.id] : []));

  // Score FAQs by how many detected entities they touch; own-card FAQs weigh most.
  const scores = new Map<string, number>();
  const bump = (id: string, n: number) => scores.set(id, (scores.get(id) ?? 0) + n);
  for (const slug of cardSlugs) {
    const c = s.cards.get(slug)!;
    c.faqs.forEach((id) => bump(id, 3));
    c.mentions.forEach((id) => bump(id, 1.5));
  }
  for (const id of termIds) {
    s.codex.get(id)!.faqs.forEach((fid, rank) => bump(fid, 2 - Math.min(rank, 20) * 0.05));
  }
  // Blend in full-text relevance of the whole query, so FAQ phrased like the question rise.
  const faqHits = hits.filter((h) => h.doc.type === 'faq');
  const maxText = faqHits[0]?.score ?? 1;
  const textScore = new Map(faqHits.map((h) => [h.doc.href.split('/')[2], h.score / maxText]));
  for (const [id, t] of textScore) if (t > 0.5 && !scores.has(id)) scores.set(id, 0);

  const multi = entities.length > 1;
  const faqs = [...scores.entries()]
    .map(([id, score]) => {
      const f = s.faqs.get(id)!;
      // Reward FAQs that cover several of the entities at once.
      const covered = cardSlugs.filter((c) => f.cards.includes(c) || f.refs.includes(c)).length + termIds.filter((t) => f.terms.includes(t)).length;
      return { f, score: score * (multi ? Math.max(covered, 0.5) : 1) + 4 * (textScore.get(id) ?? 0) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((x) => x.f);

  const ruleIds = new Set<string>();
  for (const id of termIds) s.codex.get(id)!.rules.slice(0, 2).forEach((r) => ruleIds.add(r));
  const rules = [...ruleIds].slice(0, 3).map((id) => s.rules.get(id)!);

  const termSet = new Set(termIds);
  const terms = cardSlugs
    .flatMap((slug) => s.cards.get(slug)!.terms)
    .filter((id) => !termSet.has(id) && (termSet.add(id), true))
    .slice(0, 6)
    .map((id) => s.codex.get(id)!);

  return { entities, faqs, rules, terms };
}
