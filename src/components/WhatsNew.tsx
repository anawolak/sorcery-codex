import { useEffect, useState } from 'preact/hooks';
import { CHANGELOG, type Release } from '../changelog';

const SEEN_KEY = 'whats-new-seen';
const RETURNING_KEYS = ['images-version', 'recent-searches', 'pins', 'visit-last', 'update-pending', 'theme', 'accent'];

function get(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function set(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function unseenReleases(): Release[] {
  const latest = CHANGELOG[0];
  if (!latest) return [];
  const seen = get(SEEN_KEY);
  if (seen === latest.id) return [];
  if (!seen && !RETURNING_KEYS.some((k) => get(k) != null)) {
    set(SEEN_KEY, latest.id);
    return [];
  }
  return CHANGELOG.filter((r) => !seen || r.id > seen);
}

export function WhatsNew() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReleases(unseenReleases()), 800);
    return () => clearTimeout(t);
  }, []);

  if (!releases.length) return null;

  const close = () => {
    set(SEEN_KEY, CHANGELOG[0].id);
    setClosing(true);
    setTimeout(() => setReleases([]), 180);
  };

  return (
    <div class={`wn-wrap${closing ? ' closing' : ''}`} role="dialog" aria-modal="true" aria-labelledby="wn-title">
      <div class="wn-backdrop" onClick={close} />
      <div class="wn-card">
        <h2 id="wn-title" class="serif">What’s new</h2>
        {releases.map((r) => (
          <section key={r.id}>
            <span class="eyebrow">{new Date(r.id).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
            <ul>
              {r.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
        <button type="button" class="wn-ok" onClick={close}>
          Got it
        </button>
      </div>
    </div>
  );
}
