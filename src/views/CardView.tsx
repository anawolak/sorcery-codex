import { useState } from 'preact/hooks';
import { ExternalIcon } from '../components/Icons';
import { ImageViewer } from '../components/ImageViewer';
import { PinButton } from '../components/PinButton';
import { NavBar } from '../components/NavBar';
import { CostBadge, FaqItem, Group, TermChips, Threshold } from '../components/Rows';
import { TermText } from '../components/RichText';
import { cardImage, getStore, printingImage } from '../data';
import type { Card } from '../types';
import { NotFound } from './NotFound';

const FINISH: Record<string, string> = { Standard: '', Foil: 'Foil', Rainbow: 'Rainbow' };

function Stats({ card }: { card: Card }) {
  const stats: [string, number | null][] = [
    ['Power', card.attack],
    ['Defense', card.defense !== card.attack ? card.defense : null],
    ['Life', card.life],
  ];
  return (
    <div class="stats">
      {card.cost != null && (
        <div class="stat">
          <CostBadge card={card} />
          <span>Cost</span>
        </div>
      )}
      {card.th.some(Boolean) && (
        <div class="stat">
          <Threshold th={card.th} size={16} />
          <span>Threshold</span>
        </div>
      )}
      {stats
        .filter(([, v]) => v != null)
        .map(([label, v]) => (
          <div class="stat" key={label}>
            <b>{v}</b>
            <span>{label}</span>
          </div>
        ))}
      {card.rarity && (
        <div class="stat">
          <b class="rarity">{card.rarity}</b>
          <span>Rarity</span>
        </div>
      )}
    </div>
  );
}

export function CardView({ slug }: { slug: string }) {
  const s = getStore();
  const card = s.cards.get(slug);
  const [viewer, setViewer] = useState<{ src: string; hi: string } | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  if (!card) return <NotFound />;

  const faqs = card.faqs.map((id) => s.faqs.get(id)!).filter(Boolean);
  const mentions = card.mentions.map((id) => s.faqs.get(id)!).filter(Boolean);
  const printings = card.printings.filter((p, i, all) => all.findIndex((q) => q.set === p.set && q.finish === p.finish && q.product === p.product) === i);

  return (
    <div class="page detail">
      <NavBar title={card.name} right={<PinButton pin={{ kind: 'card', key: `/card/${card.slug}`, title: card.name }} />} />
      <div class="card-hero">
        <button type="button" class="hero-img" onClick={() => setViewer({ src: cardImage(card), hi: printingImage(card.img) })} aria-label="View full size">
          <img src={cardImage(card)} alt={card.name} decoding="async" />
        </button>
      </div>
      <div class="card-head">
        <h1 class="serif">{card.name}</h1>
        <p class="typeline">{card.typeline || [card.rarity, card.type].filter(Boolean).join(' ')}</p>
      </div>
      <Stats card={card} />
      {card.rules && (
        <div class="rules-box">
          <p class="pre">
            <TermText text={card.rules} terms={card.terms} />
          </p>
        </div>
      )}
      {card.terms.length > 0 && (
        <Group title="Rules on this card">
          <TermChips ids={card.terms} />
        </Group>
      )}
      {faqs.length > 0 && (
        <Group title={`FAQ · ${faqs.length}`}>
          {faqs.map((f) => (
            <FaqItem key={f.id} faq={f} open={faqs.length <= 3} showCards={false} />
          ))}
        </Group>
      )}
      {mentions.length > 0 && (
        <Group
          title={`Mentioned in other FAQ · ${mentions.length}`}
          action={
            !showMentions && (
              <button type="button" class="link-btn" onClick={() => setShowMentions(true)}>
                Show
              </button>
            )
          }
        >
          {showMentions && mentions.map((f) => <FaqItem key={f.id} faq={f} />)}
        </Group>
      )}
      <Group title={`Printings · ${printings.length}`}>
        <div class="strip">
          {printings.map((p) => (
            <button key={p.slug} type="button" class="strip-card" onClick={() => setViewer({ src: p.slug === card.img ? cardImage(card) : printingImage(p.slug), hi: printingImage(p.slug) })}>
              <img class="thumb thumb-md" src={p.slug === card.img ? cardImage(card) : printingImage(p.slug)} alt="" loading="lazy" decoding="async" />
              <span>
                {p.set}
                {FINISH[p.finish] ? ` · ${FINISH[p.finish]}` : ''}
              </span>
            </button>
          ))}
        </div>
      </Group>
      {(card.flavor || card.artist) && (
        <div class="flavor">
          {card.flavor && <p class="serif">{card.flavor}</p>}
          {card.artist && <p class="muted small">Illustrated by {card.artist}</p>}
        </div>
      )}
      <a class="external" href={`https://sorcerytcg.com/cards/${card.slug}`} target="_blank" rel="noopener">
        View on sorcerytcg.com <ExternalIcon width={14} height={14} />
      </a>
      {viewer && <ImageViewer src={viewer.src} hiRes={viewer.hi} alt={card.name} onClose={() => setViewer(null)} />}
    </div>
  );
}
