import fs from 'node:fs';
import path from 'node:path';
import type { Block, Span } from '../src/types';

export const ROOT = path.resolve(import.meta.dirname, '..');
export const RAW = path.join(ROOT, 'data/raw');
export const OUT = path.join(ROOT, 'public/data');
export const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) SorceryCodexPWA/1.0 (personal offline reference)';

export function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

export function writeJson(file: string, data: unknown, pretty = false) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, pretty ? 1 : 0));
}

export async function fetchWithRetry(url: string, tries = 4): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
      if (res.ok) return res;
      lastErr = new Error(`${res.status} ${res.statusText} for ${url}`);
      if (res.status === 404) break;
    } catch (err) {
      lastErr = err;
    }
    await sleep(1000 * 2 ** i);
  }
  throw lastErr;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function extractRscPayload(html: string): string {
  const re = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
  let out = '';
  for (const m of html.matchAll(re)) out += JSON.parse(`"${m[1]}"`);
  return out;
}

export function extractDatasets(payload: string): Record<string, any[]> {
  const sets: Record<string, any[]> = {};
  const marker = '{"json":[';
  let from = 0;
  for (;;) {
    const start = payload.indexOf(marker, from);
    if (start < 0) break;
    const end = matchingBrace(payload, start);
    from = start + marker.length;
    if (end < 0) continue;
    try {
      const arr = JSON.parse(payload.slice(start, end + 1)).json;
      const type = arr?.[0]?._type;
      if (type && (!sets[type] || sets[type].length < arr.length)) sets[type] = arr;
    } catch {}
  }
  return sets;
}

function matchingBrace(s: string, start: number): number {
  let depth = 0;
  let inStr = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (c === '\\') i++;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

export function portableToBlocks(pt: any[] | undefined): Block[] {
  const blocks: Block[] = [];
  for (const b of pt ?? []) {
    if (b._type === 'damageGrid') {
      blocks.push({ t: 'grid', grid: (b.grid?.rows ?? []).map((r: any) => r.cells as string[]) });
      continue;
    }
    if (b._type !== 'block') continue;
    const spans: Span[] = (b.children ?? [])
      .filter((c: any) => typeof c.text === 'string' && c.text.length)
      .map((c: any) => {
        const s: Span = { x: c.text.replace(/ {2,}/g, ' ') };
        if (c.marks?.includes('strong')) s.b = 1;
        if (c.marks?.includes('em')) s.i = 1;
        return s;
      });
    if (!spans.length) continue;
    const style: string = b.style ?? 'normal';
    if (b.listItem) blocks.push({ t: 'li', lvl: b.level ?? 1, ord: b.listItem === 'number' ? 1 : undefined, spans });
    else if (/^h\d$/.test(style)) blocks.push({ t: 'h', spans });
    else blocks.push({ t: 'p', spans });
  }
  return blocks;
}

export function blocksToText(blocks: Block[]): string {
  return blocks
    .map((b) => (b.t === 'grid' ? '' : b.spans.map((s) => s.x).join('')))
    .filter(Boolean)
    .join('\n')
    .replace(MARKUP, (_m, a, b, c) => a ?? b ?? c);
}

export const MARKUP = /\[\[([^\]]+)\]\]|\(\(([^()]+)\)\)|\)\)([^()]+)\(\(/g;

export function slugify(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
