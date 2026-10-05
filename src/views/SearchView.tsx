import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { CloseIcon, ClockIcon, SearchIcon, ShareIcon, SparkIcon } from '../components/Icons';
import { useScrolled } from '../components/NavBar';
import { CardRow, CardThumb, FaqItem, Group, Highlight, LinkRow, RuleRow, TermChips } from '../components/Rows';
import { OfflinePill } from './MoreView';
import { firstParagraph, getStore } from '../data';
import { currentRoute, setQueryParam } from '../router';
import { type DocType, type Hit, search, snippet } from '../search/engine';
import { type Related, related } from '../search/suggest';

const FILTERS: { key: DocType | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'card', label: 'Cards' },
  { key: 'codex', label: 'Codex' },
  { key: 'faq', label: 'FAQ' },
  { key: 'rule', label: 'Rulebook' },
];
const GROUP_LIMIT: Record<DocType, number> = { card: 6, codex: 5, faq: 5, rule: 4 };
const GROUP_TITLE: Record<DocType, string> = { card: 'Cards', codex: 'Codex', faq: 'FAQ', rule: 'Rulebook' };
const EXAMPLES = ['Airborne', 'Can a Lance unit attack sites?', "Death's Door", 'Crave Golem', 'Stealth intercept', 'Summoning sickness'];

const RECENT_KEY = 'recent-searches';
function loadRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
  } catch {
    return [];
  }
}
function saveRecent(q: string) {
  const t = q.trim();
  if (t.length < 2) return;
  const list = [t, ...loadRecent().filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 8);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

const isStandalone = () => (navigator as Navigator & { standalone?: boolean }).standalone === true || matchMedia('(display-mode: standalone)').matches;

export function SearchView() {
  const route = currentRoute();
  const [q, setQ] = useState(route.query.get('q') ?? '');
  const [filter, setFilter] = useState<DocType | 'all'>((route.query.get('f') as DocType) || 'all');
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState(loadRecent);
  const input = useRef<HTMLInputElement>(null);
  const scrolled = useScrolled(8);

  const hits = useMemo(() => search(q), [q]);
  const rel = useMemo(() => (q.trim().length >= 3 ? related(q, hits) : null), [q, hits]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: hits.length, card: 0, codex: 0, faq: 0, rule: 0 };
    for (const h of hits) c[h.doc.type]++;
    return c;
  }, [hits]);

  const update = (value: string) => {
    setQ(value);
    setQueryParam('q', value);
  };
  const setF = (f: DocType | 'all') => {
    setFilter(f);
    setQueryParam('f', f === 'all' ? '' : f);
    window.scrollTo(0, 0);
  };

  // Remember the query when the user opens something from the results.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element).closest?.('.results a, .related a, .related .faq-q')) saveRecent(q);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [q]);

  // iOS-like: scrolling the results dismisses the keyboard.
  useEffect(() => {
    const onTouch = (e: TouchEvent) => {
      if (document.activeElement === input.current && !(e.target as Element).closest('.searchbar')) input.current?.blur();
    };
    window.addEventListener('touchmove', onTouch, { passive: true });
    return () => window.removeEventListener('touchmove', onTouch);
  }, []);

  const active = q.trim().length > 0;

  return (
    <div class="page search-page">
      <div class={`search-head${scrolled || active ? ' scrolled' : ''}${focused || active ? ' compact' : ''}`}>
        <h1 class="serif search-title">Codex</h1>
        <form
          class="searchbar"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            saveRecent(q);
            input.current?.blur();
          }}
        >
          <label class="search-field">
            <SearchIcon width={17} height={17} />
            <input
              ref={input}
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellcheck={false}
              placeholder="Cards, rules, keywords, questions…"
              value={q}
              onInput={(e) => update((e.target as HTMLInputElement).value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              aria-label="Search everything"
            />
            {q && (
              <button
                type="button"
                class="clear"
                aria-label="Clear"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  update('');
                  input.current?.focus();
                }}
              >
                <CloseIcon width={12} height={12} />
              </button>
            )}
          </label>
          {(focused || active) && (
            <button
              type="button"
              class="cancel"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                update('');
                setF('all');
                input.current?.blur();
              }}
            >
              Cancel
            </button>
          )}
        </form>
        {active && (
          <div class="segments" role="tablist">
            {FILTERS.map((f) => (
              <button key={f.key} role="tab" aria-selected={filter === f.key} class={filter === f.key ? 'on' : ''} onClick={() => setF(f.key)} disabled={f.key !== 'all' && !counts[f.key]}>
                {f.label}
                {f.key !== 'all' && counts[f.key] > 0 && <span class="count">{counts[f.key] > 99 ? '99+' : counts[f.key]}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {!active ? (
        <Home
          recent={recent}
          onPick={(t) => {
            update(t);
            saveRecent(t);
          }}
          onClearRecent={() => {
            try {
              localStorage.removeItem(RECENT_KEY);
            } catch {
              /* ignore */
            }
            setRecent([]);
          }}
        />
      ) : (
        <div class="results">
          {filter === 'all' && rel && <RelatedPanel rel={rel} />}
          {hits.length === 0 && <Empty q={q} />}
          {filter === 'all' ? <Grouped hits={hits} onMore={setF} /> : <Flat hits={hits.filter((h) => h.doc.type === filter)} />}
        </div>
      )}
    </div>
  );
}

function Home({ recent, onPick, onClearRecent }: { recent: string[]; onPick: (q: string) => void; onClearRecent: () => void }) {
  const s = getStore();
  return (
    <div class="home">
      <OfflinePill />
      {!isStandalone() && /iPhone|iPad/.test(navigator.userAgent) && (
        <div class="install-hint">
          <strong>Install as an app</strong>
          <span>
            Tap <ShareIcon width={15} height={15} /> Share, then <em>Add to Home Screen</em>. Works fully offline.
          </span>
        </div>
      )}
      {recent.length > 0 && (
        <Group
          title="Recent"
          action={
            <button type="button" class="link-btn" onClick={onClearRecent}>
              Clear
            </button>
          }
        >
          {recent.map((r) => (
            <button key={r} type="button" class="row" onClick={() => onPick(r)}>
              <span class="row-icon">
                <ClockIcon width={16} height={16} />
              </span>
              <div class="row-main">
                <div class="row-title">{r}</div>
              </div>
            </button>
          ))}
        </Group>
      )}
      <Group title="Try">
        <div class="chips wrap">
          {EXAMPLES.map((e) => (
            <button key={e} type="button" class="chip" onClick={() => onPick(e)}>
              {e}
            </button>
          ))}
        </div>
      </Group>
      <Group title="Library">
        <LinkRow href="/cards" title="Cards" sub={`${s.db.cards.length} cards with images`} icon={<span class="pill">C</span>} />
        <LinkRow href="/codex" title="Codex" sub={`${s.db.codex.length} entries & ${s.db.faqs.length} FAQ`} icon={<span class="pill">X</span>} />
        <LinkRow href="/rules" title="Rulebook" sub={`${s.db.rules.length} sections`} icon={<span class="pill">§</span>} />
      </Group>
    </div>
  );
}

function Empty({ q }: { q: string }) {
  return (
    <div class="empty">
      <p>No results for “{q}”.</p>
      <p class="muted small">Try a card name, a keyword like “Airborne”, or a question.</p>
    </div>
  );
}

/** Smart suggestions: what the query is about, the definition, and the FAQ that answer it. */
function RelatedPanel({ rel }: { rel: Related }) {
  return (
    <section class="related">
      <div class="related-head">
        <SparkIcon width={14} height={14} /> {rel.entities.length > 1 ? 'Your question involves' : 'Best match'}
      </div>
      {rel.entities.slice(0, 3).map((e) =>
        e.kind === 'term' ? (
          <a key={e.entry.id} class="def-card" href={`#/codex/${e.entry.id}`}>
            <span class="eyebrow">Codex</span>
            <strong class="serif">{e.entry.title}</strong>
            <p>{firstParagraph(e.entry.blocks, 260)}</p>
          </a>
        ) : (
          <a key={e.card.slug} class="def-card card-def" href={`#/card/${e.card.slug}`}>
            <CardThumb card={e.card} size="md" />
            <div>
              <span class="eyebrow">{e.card.typeline || e.card.type}</span>
              <strong class="serif">{e.card.name}</strong>
              <p class="pre">{e.card.rules}</p>
            </div>
          </a>
        ),
      )}
      {rel.terms.length > 0 && (
        <div class="related-terms">
          <span class="muted small">Rules on this card</span>
          <TermChips ids={rel.terms.map((t) => t.id)} />
        </div>
      )}
      {rel.faqs.length > 0 && (
        <div class="related-block">
          <h3>Relevant FAQ</h3>
          {rel.faqs.map((f, i) => (
            <FaqItem key={f.id} faq={f} open={i === 0 && rel.entities.length > 1} />
          ))}
        </div>
      )}
      {rel.rules.length > 0 && (
        <div class="related-block">
          <h3>In the Rulebook</h3>
          {rel.rules.map((r) => (
            <RuleRow key={r.id} rule={r} />
          ))}
        </div>
      )}
    </section>
  );
}

function ResultRow({ hit }: { hit: Hit }) {
  const { doc, terms } = hit;
  const s = getStore();
  if (doc.type === 'card') {
    const card = s.cards.get(doc.href.split('/')[2])!;
    return <CardRow card={card} note={<Highlight text={snippet(doc.body || doc.sub, terms, 90)} terms={terms} />} />;
  }
  if (doc.type === 'faq') {
    return <FaqItem faq={s.faqs.get(doc.href.split('/')[2])!} />;
  }
  return (
    <LinkRow
      href={doc.href}
      title={<Highlight text={doc.title} terms={terms} />}
      sub={
        <>
          <span class="row-kicker">{doc.sub}</span>
          <Highlight text={snippet(doc.body, terms, 110)} terms={terms} />
        </>
      }
      icon={<span class="pill">{doc.type === 'rule' ? '§' : 'X'}</span>}
    />
  );
}

function Grouped({ hits, onMore }: { hits: Hit[]; onMore: (t: DocType) => void }) {
  const groups: Record<DocType, Hit[]> = { card: [], codex: [], faq: [], rule: [] };
  for (const h of hits) groups[h.doc.type].push(h);
  // Order groups by their best hit so the most relevant kind of answer comes first.
  const order = (Object.keys(groups) as DocType[]).filter((t) => groups[t].length).sort((a, b) => groups[b][0].score - groups[a][0].score);
  return (
    <>
      {order.map((t) => (
        <Group
          key={t}
          title={GROUP_TITLE[t]}
          action={
            groups[t].length > GROUP_LIMIT[t] && (
              <button type="button" class="link-btn" onClick={() => onMore(t)}>
                See all {groups[t].length}
              </button>
            )
          }
        >
          {groups[t].slice(0, GROUP_LIMIT[t]).map((h) => (
            <ResultRow key={h.doc.id} hit={h} />
          ))}
        </Group>
      ))}
    </>
  );
}

function Flat({ hits }: { hits: Hit[] }) {
  const [n, setN] = useState(50);
  return (
    <div class="group">
      <div class="group-body">
        {hits.slice(0, n).map((h) => (
          <ResultRow key={h.doc.id} hit={h} />
        ))}
      </div>
      {hits.length > n && (
        <button type="button" class="more-btn" onClick={() => setN(n + 50)}>
          Show more ({hits.length - n})
        </button>
      )}
    </div>
  );
}

