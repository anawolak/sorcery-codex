import { useEffect, useState } from 'preact/hooks';
import { currentRoute } from '../router';
import { CheckIcon, LinkIcon } from './Icons';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {}
    ta.remove();
    return ok;
  }
}

export function pageUrl(path = currentRoute().path) {
  return `${location.origin}${location.pathname}#${path}`;
}

export function CopyLinkButton() {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  useEffect(() => {
    if (state === 'idle') return;
    const t = setTimeout(() => setState('idle'), 1800);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <>
      <button
        type="button"
        class={`nav-icon${state === 'copied' ? ' on' : ''}`}
        aria-label="Copy link to this page"
        title="Copy link"
        onClick={async () => setState((await copyText(pageUrl())) ? 'copied' : 'failed')}
      >
        {state === 'copied' ? <CheckIcon width={22} height={22} /> : <LinkIcon width={22} height={22} />}
      </button>
      {state !== 'idle' && (
        <div class="mini-toast" role="status">
          {state === 'copied' ? 'Link copied' : 'Couldn’t copy the link'}
        </div>
      )}
    </>
  );
}
