/** Inline text run. `x` may contain `[[Card or Term]]` link markup. */
export interface Span {
  x: string;
  b?: 1;
  i?: 1;
}

export type Block =
  | { t: 'p' | 'h'; spans: Span[] }
  | { t: 'li'; lvl: number; ord?: 1; spans: Span[] }
  | { t: 'grid'; grid: string[][] };

export interface Printing {
  slug: string;
  set: string;
  finish: string;
  product: string;
}

export interface Card {
  slug: string;
  name: string;
  type: string;
  category: string;
  rarity: string | null;
  rules: string;
  cost: number | null;
  attack: number | null;
  defense: number | null;
  life: number | null;
  /** Elemental threshold: air, earth, fire, water. */
  th: [number, number, number, number];
  elements: string[];
  subtypes: string[];
  keywords: string[];
  typeline: string;
  flavor: string | null;
  artist: string | null;
  sets: string[];
  /** Printing slug of the image cached for offline use. */
  img: string;
  printings: Printing[];
  /** Related codex entry ids, most specific first. */
  terms: string[];
  /** FAQ ids about this card. */
  faqs: string[];
  /** FAQ ids about other cards that mention this card. */
  mentions: string[];
}

export interface CodexSub {
  id: string;
  title: string;
  blocks: Block[];
}

export interface CodexEntry {
  id: string;
  title: string;
  aliases: string[];
  blocks: Block[];
  subs: CodexSub[];
  updated: string;
  /** Card slugs whose rules text uses this term (capped). */
  cards: string[];
  cardCount: number;
  faqs: string[];
  rules: string[];
  /** Other codex entries referenced from this entry. */
  see: string[];
  /** Too common to be a useful suggestion on its own (e.g. "Minion", "May and Can"). */
  generic?: 1;
}

export interface Faq {
  id: string;
  q: string;
  a: Block[];
  cards: string[];
  terms: string[];
  /** Cards linked from within the answer. */
  refs: string[];
  updated: string;
}

export interface RuleSection {
  id: string;
  chapter: string;
  title: string;
  page: number;
  paras: string[];
  terms: string[];
}

export interface DB {
  version: string;
  generated: string;
  cards: Card[];
  codex: CodexEntry[];
  faqs: Faq[];
  rules: RuleSection[];
}
