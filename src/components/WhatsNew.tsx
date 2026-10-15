import { useState } from 'preact/hooks';
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
  const [releases, setReleases] = useState<Release[]>(unseenReleases);

  if (!releases.length) return null;

  const close = () => {
    set(SEEN_KEY, CHANGELOG[0].id);
    setReleases([]);
  };

  return (
    <section class="group wn" aria-labelledby="wn-title">
      <header class="group-head">
        <h2 id="wn-title">What’s new</h2>
        <button type="button" class="link-btn" onClick={close}>
          Got it
        </button>
      </header>
      <div class="group-body wn-body">
        {releases.map((r) => (
          <div key={r.id}>
            <span class="eyebrow">{new Date(r.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
            <ul>
              {r.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
