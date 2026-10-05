import { PinButton } from '../components/PinButton';
import { LargeTitle, NavBar } from '../components/NavBar';
import { Group, LinkRow, TermChips } from '../components/Rows';
import { TermText } from '../components/RichText';
import { getStore } from '../data';
import type { RuleSection } from '../types';
import { NotFound } from './NotFound';

export function RulesIndexView() {
  const s = getStore();
  const chapters: { title: string; sections: RuleSection[] }[] = [];
  for (const r of s.db.rules) {
    const last = chapters[chapters.length - 1];
    if (!last || last.title !== r.chapter) chapters.push({ title: r.chapter, sections: [r] });
    else last.sections.push(r);
  }
  return (
    <div class="page">
      <LargeTitle title="Rulebook" />
      {chapters.map((ch) => (
        <Group key={ch.title} title={ch.title}>
          {ch.sections.map((r) => (
            <LinkRow key={r.id} href={`/rule/${r.id}`} title={r.title === ch.title ? 'Overview' : r.title} sub={`p. ${r.page}`} />
          ))}
        </Group>
      ))}
      <p class="muted small center pad">Text extracted from the official rulebook. Diagrams are not included — see the PDF on sorcerytcg.com.</p>
    </div>
  );
}

export function RuleView({ id }: { id: string }) {
  const s = getStore();
  const i = s.db.rules.findIndex((r) => r.id === id);
  const rule = s.db.rules[i];
  if (!rule) return <NotFound />;
  const prev = s.db.rules[i - 1];
  const next = s.db.rules[i + 1];
  const seen = new Set<string>();
  return (
    <div class="page detail">
      <NavBar title={rule.title} right={<PinButton pin={{ kind: 'rule', key: `/rule/${rule.id}`, title: rule.title }} />} />
      <article class="article">
        <span class="eyebrow">
          {rule.chapter !== rule.title ? `${rule.chapter} · ` : ''}Page {rule.page}
        </span>
        <h1 class="serif">{rule.title}</h1>
        <div class="rich">
          {rule.paras.map((p, n) =>
            p.startsWith('## ') ? (
              <h3 key={n}>{p.slice(3)}</h3>
            ) : (
              <p key={n} class={/^[•●]/.test(p) ? 'bullet' : undefined}>
                <TermText text={p.replace(/^[•●]\s*/, '')} terms={rule.terms} once seen={seen} />
              </p>
            ),
          )}
        </div>
      </article>
      {rule.terms.length > 0 && (
        <Group title="Codex entries">
          <TermChips ids={rule.terms} />
        </Group>
      )}
      <div class="pager">
        {prev ? <LinkRow href={`/rule/${prev.id}`} title={prev.title} sub="Previous" /> : <span />}
        {next && <LinkRow href={`/rule/${next.id}`} title={next.title} sub="Next" />}
      </div>
    </div>
  );
}
