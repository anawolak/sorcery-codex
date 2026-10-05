import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import type { DB } from '../src/types';
import { OUT, ROOT, ensureDir, fetchWithRetry, readJson } from './lib';

export const IMAGE_CDN = 'https://d27a44hjr9gen3.cloudfront.net/cards';
const DIR = path.join(ROOT, 'public/cards');
const CONCURRENCY = 6;

const db = readJson<DB>(path.join(OUT, 'db.json'));
ensureDir(DIR);

const wanted = new Set(db.cards.map((c) => c.img).filter(Boolean));
const todo = [...wanted].filter((slug) => !fs.existsSync(path.join(DIR, `${slug}.webp`)));
let done = 0;
let failed = 0;

async function worker() {
  for (;;) {
    const slug = todo.shift();
    if (!slug) return;
    try {
      const png = Buffer.from(await (await fetchWithRetry(`${IMAGE_CDN}/${slug}.png`)).arrayBuffer());
      await sharp(png).resize({ width: 380, withoutEnlargement: true }).flatten({ background: '#0f0e0c' }).webp({ quality: 72, effort: 6 }).toFile(path.join(DIR, `${slug}.webp`));
    } catch (err) {
      failed++;
      console.warn(`! ${slug}: ${(err as Error).message}`);
    }
    if (++done % 100 === 0) console.log(`  ${done} images…`);
  }
}

console.log(`images: ${wanted.size} wanted, ${todo.length} to download`);
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

for (const f of fs.readdirSync(DIR)) {
  if (f.endsWith('.webp') && !wanted.has(f.slice(0, -5))) fs.rmSync(path.join(DIR, f));
}
const bytes = fs.readdirSync(DIR).reduce((n, f) => n + fs.statSync(path.join(DIR, f)).size, 0);
console.log(`images done: ${failed} failed, total ${(bytes / 1e6).toFixed(1)} MB`);
if (failed > wanted.size * 0.05) process.exit(1);
