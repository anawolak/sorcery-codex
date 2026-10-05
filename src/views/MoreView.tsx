import { useEffect, useState } from 'preact/hooks';
import { ExternalIcon } from '../components/Icons';
import { LargeTitle } from '../components/NavBar';
import { Group } from '../components/Rows';
import { getStore } from '../data';
import { downloadAllImages, getOfflineState, type OfflineState, subscribeOffline } from '../offline';
import { checkForUpdate } from '../pwa';
import { COUNTED_HOST, useVisitTotal } from '../visits';

function useOffline(): OfflineState {
  const [s, set] = useState(getOfflineState);
  useEffect(() => subscribeOffline(set), []);
  return s;
}

const mb = (n: number | null) => (n == null ? '—' : `${(n / 1e6).toFixed(0)} MB`);

export function OfflinePill() {
  const s = useOffline();
  if (s.status !== 'downloading' && s.status !== 'checking') return null;
  const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
  return (
    <a class="offline-pill" href="#/more">
      <span>Saving cards for offline use… {pct}%</span>
      <span class="bar">
        <span style={{ width: `${pct}%` }} />
      </span>
    </a>
  );
}

const ACCENTS = [
  { id: 'gold', label: 'Gold', d: '#d9b56b', l: '#94661a' },
  { id: 'pink', label: 'Pink', d: '#f48fb8', l: '#c2185b' },
  { id: 'violet', label: 'Violet', d: '#b39ddb', l: '#6a4bb0' },
  { id: 'blue', label: 'Blue', d: '#7fb3f0', l: '#2c66b8' },
  { id: 'teal', label: 'Teal', d: '#5ec8b8', l: '#00796b' },
  { id: 'green', label: 'Green', d: '#9ccc65', l: '#4a7d1e' },
  { id: 'coral', label: 'Coral', d: '#f28b6b', l: '#c0442a' },
] as const;

function getAccent(): string {
  try {
    return localStorage.getItem('accent') || 'gold';
  } catch {
    return 'gold';
  }
}
function setAccent(id: string) {
  try {
    if (id === 'gold') localStorage.removeItem('accent');
    else localStorage.setItem('accent', id);
  } catch {}
  if (id === 'gold') delete document.documentElement.dataset.accent;
  else document.documentElement.dataset.accent = id;
}

type Theme = 'system' | 'dark' | 'light';
function getTheme(): Theme {
  try {
    return (localStorage.getItem('theme') as Theme) || 'system';
  } catch {
    return 'system';
  }
}
function setTheme(t: Theme) {
  try {
    if (t === 'system') localStorage.removeItem('theme');
    else localStorage.setItem('theme', t);
  } catch {}
  if (t === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
}

export function MoreView() {
  const s = getStore();
  const off = useOffline();
  const [theme, setT] = useState<Theme>(getTheme);
  const [accent, setA] = useState(getAccent);
  const [updateMsg, setUpdateMsg] = useState('');
  const visits = useVisitTotal();
  const pct = off.total ? Math.round((off.done / off.total) * 100) : 0;

  const statusText: Record<OfflineState['status'], string> = {
    idle: 'Waiting to start',
    checking: 'Checking cache…',
    downloading: `Downloading ${off.done} / ${off.total}`,
    done: `All ${off.total} card images available offline`,
    error: `${off.failed} images failed — tap Retry when online`,
    unsupported: 'Offline storage not supported in this browser',
  };

  return (
    <div class="page">
      <LargeTitle title="More" />
      <Group title="Offline">
        <div class="setting">
          <div class="setting-main">
            <strong>Card images</strong>
            <span class="muted small">{statusText[off.status]}</span>
            {(off.status === 'downloading' || off.status === 'checking') && (
              <span class="bar">
                <span style={{ width: `${pct}%` }} />
              </span>
            )}
          </div>
          {(off.status === 'error' || off.status === 'done') && (
            <button type="button" class="btn" onClick={() => downloadAllImages()}>
              {off.status === 'error' ? 'Retry' : 'Verify'}
            </button>
          )}
        </div>
        <div class="setting">
          <div class="setting-main">
            <strong>Storage used</strong>
            <span class="muted small">
              {mb(off.usage)}
              {off.persisted ? ' · protected from automatic cleanup' : ''}
            </span>
          </div>
        </div>
        <div class="setting">
          <div class="setting-main">
            <strong>Data</strong>
            <span class="muted small">
              {s.db.cards.length} cards · {s.db.codex.length} Codex · {s.db.faqs.length} FAQ · {s.db.rules.length} rule sections
              <br />
              Rulings as of {new Date(s.db.generated).toLocaleDateString(undefined, { dateStyle: 'medium' })}
            </span>
            {updateMsg && <span class="small accent">{updateMsg}</span>}
          </div>
          <button
            type="button"
            class="btn"
            onClick={async () => {
              setUpdateMsg('Checking…');
              setUpdateMsg(await checkForUpdate());
            }}
          >
            Check
          </button>
        </div>
      </Group>
      <Group title="Appearance">
        <div class="segments wide">
          {(['system', 'dark', 'light'] as Theme[]).map((t) => (
            <button
              key={t}
              type="button"
              class={theme === t ? 'on' : ''}
              onClick={() => {
                setTheme(t);
                setT(t);
              }}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div class="swatch-body">
          <div class="swatches" role="radiogroup" aria-label="Accent color">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={accent === a.id}
                aria-label={a.label}
                title={a.label}
                class={`swatch${accent === a.id ? ' on' : ''}`}
                style={{ '--sw-d': a.d, '--sw-l': a.l }}
                onClick={() => {
                  setAccent(a.id);
                  setA(a.id);
                }}
              />
            ))}
          </div>
        </div>
      </Group>
      <Group title="Sources">
        <a class="row" href="https://sorcerytcg.com/codex" target="_blank" rel="noopener">
          <div class="row-main">
            <div class="row-title">Official Codex & FAQ</div>
            <div class="row-sub">sorcerytcg.com/codex</div>
          </div>
          <ExternalIcon class="row-chev" width={15} height={15} />
        </a>
        <a class="row" href="https://sorcerytcg.com/how-to-play" target="_blank" rel="noopener">
          <div class="row-main">
            <div class="row-title">Rulebook PDF (with diagrams)</div>
            <div class="row-sub">sorcerytcg.com/how-to-play</div>
          </div>
          <ExternalIcon class="row-chev" width={15} height={15} />
        </a>
      </Group>
      <Group title="About">
        <a class="row" href="https://www.anastory.com" target="_blank" rel="noopener">
          <div class="row-main">
            <div class="row-title">Made by Ana</div>
            <div class="row-sub">anastory.com</div>
          </div>
          <ExternalIcon class="row-chev" width={15} height={15} />
        </a>
        <a class="row" href="https://sorcerytcg.com/profile/cmt88hm6701wh92cygiom0gay" target="_blank" rel="noopener">
          <div class="row-main">
            <div class="row-title">Ana’s decks</div>
            <div class="row-sub">sorcerytcg.com profile</div>
          </div>
          <ExternalIcon class="row-chev" width={15} height={15} />
        </a>
      </Group>
      {visits && (
        <Group title="Usage">
          <div class="setting">
            <div class="setting-main">
              <strong>Visits</strong>
              <span class="muted small">
                {navigator.onLine ? 'Visits from all users' : `As of ${new Date(visits.at).toLocaleDateString(undefined, { dateStyle: 'medium' })}`}
              </span>
            </div>
            <b class="visit-count">{visits.count}</b>
          </div>
        </Group>
      )}
      <p class="muted small center pad">
        Unofficial fan-made reference for personal use. Sorcery: Contested Realm, card images and rules text © Erik’s Curiosa Limited. Data refreshes daily.
        {location.hostname === COUNTED_HOST && ' App opens are counted anonymously with GoatCounter (no cookies, no personal data).'}
      </p>
    </div>
  );
}
