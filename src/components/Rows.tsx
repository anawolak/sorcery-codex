import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { cardImage, getStore } from '../data';
import type { Card, CodexEntry, Faq, RuleSection } from '../types';
import { ChevronDown, ChevronRight, ELEMENTS, ElementGlyph } from './Icons';
import { RichText } from './RichText';
import { openTermSheet } from './Sheet';

export function CardThumb({ card, size = 'sm' }: { card: Card; size?: 'sm' | 'md' }) {
  return <img class={`thumb thumb-${size}`} src={cardImage(card)} alt="" loading="lazy" decoding="async" />;
}

export function Threshold({ th, size = 13 }: { th: Card['th']; size?: number }) {
  const glyphs = ELEMENTS.flatMap((el, i) => Array.from({ length: th[i] }, (_, n) => <ElementGlyph key={`${el}${n}`} el={el} size={size} />));
  return glyphs.length ? <span class="threshold">{glyphs}</span> : null;
}

export function CostBadge({ card }: { card: Card }) {
  if (card.cost == null) return null;
  return <span class="cost">{card.cost}</span>;
}

export function Group({ title, action, children }: { title: ComponentChildren; action?: ComponentChildren; children: ComponentChildren }) {
  return (
    <section class="group">
      <header class="group-head">
        <h2>{title}</h2>
        {action}
      </header>
      <div class="group-body">{children}</div>
    </section>
  );
}

export function CardRow({ card, note }: { card: Card; note?: ComponentChildren }) {
  return (
    <a class="row" href={`#/card/${card.slug}`}>
      <CardThumb card={card} />
      <div class="row-main">
        <div class="row-title">
          <span>{card.name}</span>
          <CostBadge card={card} />
          <Threshold th={card.th} size={11} />
        </div>
        <div class="row-sub">{note ?? (card.typeline || card.type)}</div>
      </div>
      <ChevronRight class="row-chev" width={16} height={16} />
    </a>
  );
}

export function LinkRow({ href, title, sub, icon }: { href: string; title: ComponentChildren; sub?: ComponentChildren; icon?: ComponentChildren }) {
  return (
    <a class="row" href={`#${href}`}>
      {icon && <span class="row-icon">{icon}</span>}
      <div class="row-main">
        <div class="row-title">{title}</div>
        {sub && <div class="row-sub">{sub}</div>}
      </div>
      <ChevronRight class="row-chev" width={16} height={16} />
    </a>
  );
}

export function RuleRow({ rule }: { rule: RuleSection }) {
  return <LinkRow href={`/rule/${rule.id}`} title={rule.title} sub={`${rule.chapter !== rule.title ? `${rule.chapter} · ` : ''}p. ${rule.page}`} icon={<span class="pill">§</span>} />;
}

/** Expandable FAQ entry: question always visible, answer inline on tap. */
export function FaqItem({ faq, open: initial = false, showCards = true }: { faq: Faq; open?: boolean; showCards?: boolean }) {
  const [open, setOpen] = useState(initial);
  const s = getStore();
  const names = faq.cards.map((c) => s.cards.get(c)?.name).filter(Boolean);
  return (
    <div class={`faq${open ? ' open' : ''}`}>
      <button type="button" class="faq-q" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span class="faq-mark">Q</span>
        <span class="faq-text">
          {faq.q}
          {showCards && names.length > 0 && <span class="faq-cards">{names.join(', ')}</span>}
        </span>
        <ChevronDown class="faq-chev" width={16} height={16} />
      </button>
      {open && (
        <div class="faq-a">
          <RichText blocks={faq.a} />
          <a class="faq-open" href={`#/faq/${faq.id}`}>
            Open <ChevronRight width={14} height={14} />
          </a>
        </div>
      )}
    </div>
  );
}

export function TermChips({ ids, max = 99 }: { ids: string[]; max?: number }) {
  const s = getStore();
  const entries = ids.slice(0, max).map((id) => s.codex.get(id)).filter((e): e is CodexEntry => !!e);
  if (!entries.length) return null;
  return (
    <div class="chips">
      {entries.map((e) => (
        <button key={e.id} type="button" class="chip" onClick={() => openTermSheet(e.id)}>
          {e.title}
        </button>
      ))}
    </div>
  );
}

export function CardStrip({ slugs }: { slugs: string[] }) {
  const s = getStore();
  return (
    <div class="strip">
      {slugs.map((slug) => {
        const c = s.cards.get(slug);
        return c ? (
          <a key={slug} class="strip-card" href={`#/card/${slug}`} aria-label={c.name}>
            <CardThumb card={c} size="md" />
            <span>{c.name}</span>
          </a>
        ) : null;
      })}
    </div>
  );
}

export function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length) return <>{text}</>;
  const esc = terms
    .filter((t) => t.length > 1)
    .sort((a, b) => b.length - a.length)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!esc.length) return <>{text}</>;
  const re = new RegExp(`(${esc.join('|')})`, 'gi');
  const parts = text.split(re);
  return <>{parts.map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : p))}</>;
}
