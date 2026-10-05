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
  th: [number, number, number, number];
  elements: string[];
  subtypes: string[];
  keywords: string[];
  typeline: string;
  flavor: string | null;
  artist: string | null;
  sets: string[];
  img: string;
  printings: Printing[];
  terms: string[];
  faqs: string[];
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
  cards: string[];
  cardCount: number;
  faqs: string[];
  rules: string[];
  see: string[];
  generic?: 1;
}

export interface Faq {
  id: string;
  q: string;
  a: Block[];
  cards: string[];
  terms: string[];
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
