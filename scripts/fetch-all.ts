/**
 * Fetches all source data into data/raw/:
 *  - cards.json   from the public card API
 *  - codex.json + faq.json   from the RSC payload of sorcerytcg.com/codex (it embeds the full datasets)
 *  - rules.json   text sections extracted from the official rulebook PDF
 * Then run build-index.ts to produce the app database.
 */
import fs from 'node:fs';
import path from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { RAW, ensureDir, extractDatasets, extractRscPayload, fetchWithRetry, slugify, writeJson } from './lib';

const CARDS_API = 'https://api.sorcerytcg.com/api/cards';
const CODEX_PAGE = 'https://sorcerytcg.com/codex';
const HOW_TO_PLAY = 'https://sorcerytcg.com/how-to-play';

async function fetchCards() {
  const cards = await (await fetchWithRetry(CARDS_API)).json();
  if (!Array.isArray(cards) || cards.length < 500) throw new Error(`Unexpected card API response (${cards?.length})`);
  writeJson(path.join(RAW, 'cards.json'), cards);
  console.log(`cards: ${cards.length}`);
}

async function fetchCodexAndFaq() {
  const html = await (await fetchWithRetry(CODEX_PAGE)).text();
  const sets = extractDatasets(extractRscPayload(html));
  const codex = sets.codex ?? [];
  const faq = sets.faq ?? [];
  if (codex.length < 100) throw new Error(`Codex dataset missing or too small (${codex.length})`);
  if (faq.length < 300) throw new Error(`FAQ dataset missing or too small (${faq.length})`);
  writeJson(path.join(RAW, 'codex.json'), codex);
  writeJson(path.join(RAW, 'faq.json'), faq);
  console.log(`codex: ${codex.length}, faq: ${faq.length}`);
}

async function downloadDrivePdf(id: string): Promise<Buffer> {
  // Large files may get an interstitial "can't scan for viruses" page; the usercontent URL with confirm=t skips it.
  const urls = [
    `https://drive.google.com/uc?export=download&id=${id}`,
    `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`,
  ];
  for (const url of urls) {
    try {
      const buf = Buffer.from(await (await fetchWithRetry(url, 2)).arrayBuffer());
      if (buf.subarray(0, 4).toString() === '%PDF') return buf;
    } catch {
      /* try the next URL */
    }
  }
  throw new Error('Rulebook download did not return a PDF');
}

async function fetchRulebook() {
  ensureDir(path.join(RAW, 'pdf'));
  let pdfPath: string | null = null;
  let id = '';
  try {
    const html = await (await fetchWithRetry(HOW_TO_PLAY)).text();
    id = html.match(/drive\.google\.com\/file\/d\/([\w-]+)/)?.[1] ?? '';
    if (!id) throw new Error('Rulebook link not found on how-to-play page');
    pdfPath = path.join(RAW, 'pdf', `rulebook-${id}.pdf`);
    if (!fs.existsSync(pdfPath)) fs.writeFileSync(pdfPath, await downloadDrivePdf(id));
  } catch (err) {
    // Fall back to the most recently cached rulebook rather than failing the whole refresh.
    const cached = fs
      .readdirSync(path.join(RAW, 'pdf'))
      .filter((f) => f.endsWith('.pdf'))
      .map((f) => path.join(RAW, 'pdf', f))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
    if (!cached) throw err;
    console.warn(`! rulebook: ${(err as Error).message} — using cached ${path.basename(cached)}`);
    pdfPath = cached;
    id = path.basename(cached).replace(/^rulebook-|\.pdf$/g, '');
  }
  const sections = await parseRulebook(pdfPath);
  writeJson(path.join(RAW, 'rules.json'), { source: `https://drive.google.com/file/d/${id}/view`, sections });
  console.log(`rulebook sections: ${sections.length}`);
}

interface Item {
  x: number;
  y: number;
  w: number;
  size: number;
  font: string;
  str: string;
}

interface RawSection {
  id: string;
  chapter: string;
  title: string;
  level: number;
  page: number;
  paras: string[];
}

/** Join items of one visual line, inserting spaces where the PDF only encodes a horizontal gap. */
function joinLine(items: Item[]): string {
  let out = '';
  let end = -Infinity;
  for (const it of items) {
    if (out && it.x - end > it.size * 0.12 && !/\s$/.test(out) && !/^\s/.test(it.str)) out += ' ';
    out += it.str;
    end = it.x + it.w;
  }
  return out.replace(/\s+/g, ' ').trim();
}

/** Split a line wherever there is a column-sized horizontal gap. */
function splitSegments(line: Item[]): Item[][] {
  const segs: Item[][] = [];
  let end = -Infinity;
  for (const it of line) {
    const seg = segs[segs.length - 1];
    if (seg && it.x - end < it.size * 1.3) seg.push(it);
    else segs.push([it]);
    end = Math.max(end, it.x + it.w);
  }
  return segs;
}

/**
 * Heuristic layout parse. Chapter titles are >= 30pt; section headings use the dominant 14-29pt
 * heading font; everything else is body. Large digit-only text are diagram callouts and "- n -"
 * are page numbers; both are dropped. Two-column pages are read column by column.
 */
async function parseRulebook(pdfPath: string): Promise<RawSection[]> {
  const doc = await getDocument({ data: new Uint8Array(fs.readFileSync(pdfPath)), verbosity: 0 }).promise;
  const pages: { items: Item[]; width: number }[] = [];
  const fontChars: Record<string, number> = {};
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const items: Item[] = [];
    for (const it of tc.items as any[]) {
      if (!it.str?.trim()) continue;
      const size = Math.round(Math.hypot(it.transform[0], it.transform[1]));
      if (/^\d+$/.test(it.str.trim()) && size >= 13) continue;
      items.push({ x: it.transform[4], y: it.transform[5], w: it.width, size, font: it.fontName, str: it.str });
      if (size >= 14 && size < 30) fontChars[it.fontName] = (fontChars[it.fontName] ?? 0) + it.str.length;
    }
    pages.push({ items, width: page.getViewport({ scale: 1 }).width });
  }
  const headingFont = Object.entries(fontChars).sort((a, b) => b[1] - a[1])[0]?.[0];

  const sections: RawSection[] = [];
  let chapter = '';
  let current: RawSection | null = null;
  let para = '';
  let lastY = 0;
  const ids = new Set<string>();

  const flushPara = () => {
    const text = para.replace(/\s+/g, ' ').trim();
    if (text && current) current.paras.push(text);
    para = '';
  };
  const startSection = (title: string, level: number, page: number) => {
    flushPara();
    let id = slugify(title);
    for (let n = 2; ids.has(id); n++) id = `${slugify(title)}-${n}`;
    ids.add(id);
    current = { id, chapter: level === 0 ? title : chapter, title, level, page, paras: [] };
    sections.push(current);
  };

  pages.forEach(({ items, width }, idx) => {
    const p = idx + 1;
    if (p === 1 || items.some((i) => /table of contents/i.test(i.str))) return;

    // Group into visual lines, then split lines into column segments.
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    const lines: Item[][] = [];
    for (const it of items) {
      const line = lines[lines.length - 1];
      if (line && Math.abs(line[0].y - it.y) < 3) line.push(it);
      else lines.push([it]);
    }
    let segs = lines.flatMap((l) => splitSegments(l.sort((a, b) => a.x - b.x)));
    const mid = width * 0.45;
    const rightBody = segs.filter((s) => s[0].x > mid && s[0].size < 14).length;
    if (rightBody >= 4) {
      // Two-column page: left column top-to-bottom, then right column.
      segs = [...segs.filter((s) => s[0].x <= mid), ...segs.filter((s) => s[0].x > mid)];
    }
    lastY = Infinity;

    for (const seg of segs) {
      const text = joinLine(seg);
      const size = Math.max(...seg.map((i) => i.size));
      const y = seg[0].y;
      if (!text || /^-\s*\d+\s*-$/.test(text)) continue;

      if (size >= 30) {
        chapter = text;
        startSection(text, 0, p);
      } else if (size >= 14 && seg.some((i) => i.font === headingFont && i.size >= 14)) {
        const level = size >= 18 ? 1 : 2;
        // A heading that wraps onto a second line continues the previous heading.
        if (current && !current.paras.length && !para && lastY - y > 0 && lastY - y < size * 1.6 && current.level === level) {
          current.title += ` ${text}`;
        } else {
          startSection(text, level, p);
        }
      } else if (size < 14) {
        if (!current) startSection('Introduction', 0, p);
        const gap = Math.abs(lastY - y);
        const newPara = gap > size * 1.9 || /^[•●▪◦]/.test(text) || /^(Step )?\d+\.\s/.test(text);
        // A short line set entirely in the heading font at body size is an inline sub-heading.
        if ((newPara || !para) && text.length < 48 && !/[.:,]$/.test(text) && seg.every((i) => i.font === headingFont)) {
          flushPara();
          para = `## ${text}`;
          flushPara();
          lastY = y;
          continue;
        }
        if (newPara) flushPara();
        para += (para && !para.endsWith('-') ? ' ' : '') + text;
      }
      lastY = y;
    }
    flushPara();
  });
  return sections.filter((s) => s.paras.length || s.level === 0);
}

const only = process.argv[2];
ensureDir(RAW);
if (!only || only === 'cards') await fetchCards();
if (!only || only === 'codex') await fetchCodexAndFaq();
if (!only || only === 'rules') await fetchRulebook();
