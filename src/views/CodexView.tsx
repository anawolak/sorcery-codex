import { useEffect, useMemo, useState } from 'preact/hooks';
import { LargeTitle, NavBar } from '../components/NavBar';
import { CardStrip, FaqItem, Group, LinkRow, RuleRow, TermChips } from '../components/Rows';
import { RichText } from '../components/RichText';
import { firstParagraph, getStore } from '../data';
import { normalize } from '../search/engine';
import { NotFound } from './NotFound';

export function CodexEntryView({ id, sub }: { id: string; sub?: string }) {
  const s = getStore();
  const entry = s.codex.get(id);
  const [faqLimit, setFaqLimit] = useState(8);
  const [cardLimit, setCardLimit] = useState(15);

  useEffect(() => {
    if (!sub) return;
    const el = document.getElementById(`sub-${sub}`);
    if (el) requestAnimationFrame(() => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 100));
  }, [id, sub]);

  if (!entry) return <NotFound />;
  const aliases = entry.aliases.filter((a) => a !== entry.title.toLowerCase());
  const faqs = entry.faqs.map((f) => s.faqs.get(f)!).filter(Boolean);
  const rules = entry.rules.map((r) => s.rules.get(r)!).filter(Boolean);

  return (
    <div class="page detail">
      <NavBar title={entry.title} />
      <article class="article">
        <span class="eyebrow">Codex</span>
        <h1 class="serif">{entry.title}</h1>
        {aliases.length > 0 && <p class="aliases">Also matches: {aliases.join(', ')}</p>}
        <RichText blocks={entry.blocks} />
        {entry.subs.map((x) => (
          <section key={x.id} id={`sub-${x.id}`} class={`subcodex${sub === x.id ? ' target' : ''}`}>
            <h2 class="serif">{x.title}</h2>
            <RichText blocks={x.blocks} />
          </section>
        ))}
        <p class="muted small updated">Updated {new Date(entry.updated).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</p>
      </article>
      {entry.see.length > 0 && (
        <Group title="See also">
          <TermChips ids={entry.see} />
        </Group>
      )}
      {rules.length > 0 && (
        <Group title="In the Rulebook">
          {rules.map((r) => (
            <RuleRow key={r.id} rule={r} />
          ))}
        </Group>
      )}
      {faqs.length > 0 && (
        <Group
          title={`Related FAQ · ${faqs.length}`}
          action={
            faqs.length > faqLimit && (
              <button type="button" class="link-btn" onClick={() => setFaqLimit(faqs.length)}>
                Show all
              </button>
            )
          }
        >
          {faqs.slice(0, faqLimit).map((f) => (
            <FaqItem key={f.id} faq={f} />
          ))}
        </Group>
      )}
      {entry.cards.length > 0 && (
        <Group
          title={`Cards · ${entry.cardCount}`}
          action={
            entry.cards.length > cardLimit && (
              <button type="button" class="link-btn" onClick={() => setCardLimit(entry.cards.length)}>
                More
              </button>
            )
          }
        >
          <CardStrip slugs={entry.cards.slice(0, cardLimit)} />
        </Group>
      )}
    </div>
  );
}

export function CodexIndexView() {
  const s = getStore();
  const [filter, setFilter] = useState('');
  const groups = useMemo(() => {
    const f = normalize(filter.trim());
    const list = s.db.codex.filter((e) => !f || normalize(e.title).includes(f) || e.aliases.some((a) => normalize(a).includes(f)));
    const map = new Map<string, typeof list>();
    for (const e of list) {
      const letter = /[a-z]/i.test(e.title[0]) ? e.title[0].toUpperCase() : '#';
      map.set(letter, [...(map.get(letter) ?? []), e]);
    }
    return [...map.entries()];
  }, [filter]);

  const jump = (letter: string) => {
    const el = document.getElementById(`letter-${letter}`);
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 96);
  };
  const onScrub = (e: TouchEvent) => {
    const t = e.touches[0];
    const el = document.elementFromPoint(t.clientX, t.clientY) as HTMLElement | null;
    const letter = el?.dataset.letter;
    if (letter) jump(letter);
    e.preventDefault();
  };

  return (
    <div class="page">
      <LargeTitle title="Codex">
        <input class="filter-input" type="search" placeholder={`Filter ${s.db.codex.length} entries`} value={filter} onInput={(e) => setFilter((e.target as HTMLInputElement).value)} autoCorrect="off" autoCapitalize="off" spellcheck={false} />
      </LargeTitle>
      {groups.map(([letter, entries]) => (
        <section key={letter} class="letter-group" id={`letter-${letter}`}>
          <h2 class="letter">{letter}</h2>
          <div class="group-body">
            {entries.map((e) => (
              <LinkRow key={e.id} href={`/codex/${e.id}`} title={e.title} sub={firstParagraph(e.blocks, 90)} />
            ))}
          </div>
        </section>
      ))}
      {!filter && (
        <nav class="scrubber" onTouchStart={onScrub} onTouchMove={onScrub} aria-label="Jump to letter">
          {groups.map(([l]) => (
            <button key={l} type="button" data-letter={l} onClick={() => jump(l)}>
              {l}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

export function FaqView({ id }: { id: string }) {
  const s = getStore();
  const faq = s.faqs.get(id);
  if (!faq) return <NotFound />;
  const cards = [...faq.cards, ...faq.refs];
  return (
    <div class="page detail">
      <NavBar title="FAQ" />
      <article class="article">
        <span class="eyebrow">FAQ</span>
        <h1 class="serif faq-title">{faq.q}</h1>
        <RichText blocks={faq.a} />
        <p class="muted small updated">Updated {new Date(faq.updated).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</p>
      </article>
      {cards.length > 0 && (
        <Group title="Cards">
          {cards.map((slug) => {
            const c = s.cards.get(slug);
            return c ? <LinkRow key={slug} href={`/card/${slug}`} title={c.name} sub={faq.cards.includes(slug) ? c.typeline : 'Mentioned'} icon={<img class="thumb thumb-sm" src={`cards/${c.img}.webp`} alt="" loading="lazy" />} /> : null;
          })}
        </Group>
      )}
      {faq.terms.length > 0 && (
        <Group title="Rules involved">
          <TermChips ids={faq.terms.slice(0, 8)} />
        </Group>
      )}
    </div>
  );
}
