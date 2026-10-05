import { useEffect, useState } from 'preact/hooks';
import { ExternalIcon } from '../components/Icons';
import { LargeTitle } from '../components/NavBar';
import { Group } from '../components/Rows';
import { getStore } from '../data';
import { downloadAllImages, getOfflineState, type OfflineState, subscribeOffline } from '../offline';
import { checkForUpdate } from '../pwa';

function useOffline(): OfflineState {
  const [s, set] = useState(getOfflineState);
  useEffect(() => subscribeOffline(set), []);
  return s;
}

const mb = (n: number | null) => (n == null ? '—' : `${(n / 1e6).toFixed(0)} MB`);

/** Compact progress shown on the search home while images are downloading. */
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
  } catch {
    /* ignore */
  }
  if (t === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
}

export function MoreView() {
  const s = getStore();
  const off = useOffline();
  const [theme, setT] = useState<Theme>(getTheme);
  const [updateMsg, setUpdateMsg] = useState('');
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
      <p class="muted small center pad">
        Unofficial fan-made reference for personal use. Sorcery: Contested Realm, card images and rules text © Erik’s Curiosa Limited. Data refreshes daily.
      </p>
    </div>
  );
}
