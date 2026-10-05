import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ROOT, ensureDir } from './lib';

const BG = '#0f0e0c';
const GOLD = '#d9b56b';

function sigil(size: number, { rounded = true, pad = 0 } = {}): string {
  const s = 512;
  const r = 150 - pad;
  const c = s / 2;
  const star = (R: number, w: number) => {
    const pts: string[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (-90 + i * 45) * (Math.PI / 180);
      const rad = i % 2 === 0 ? R : w;
      pts.push(`${(c + rad * Math.cos(a)).toFixed(1)},${(c + rad * Math.sin(a)).toFixed(1)}`);
    }
    return pts.join(' ');
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${s} ${s}">
  <defs><radialGradient id="g" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="#2a241a"/><stop offset="1" stop-color="${BG}"/></radialGradient></defs>
  <rect width="${s}" height="${s}" rx="${rounded ? 112 : 0}" fill="url(#g)"/>
  <circle cx="${c}" cy="${c}" r="${r + 38}" fill="none" stroke="${GOLD}" stroke-opacity=".55" stroke-width="6"/>
  <polygon points="${star(r + 20, r * 0.24)}" fill="${GOLD}"/>
  <circle cx="${c}" cy="${c}" r="${r * 0.16}" fill="#0f0e0c"/>
</svg>`;
}

const ICONS = path.join(ROOT, 'public/icons');
const SPLASH = path.join(ROOT, 'public/splash');
ensureDir(ICONS);
ensureDir(SPLASH);

fs.writeFileSync(path.join(ICONS, 'icon.svg'), sigil(512));
await sharp(Buffer.from(sigil(512))).png().toFile(path.join(ICONS, 'icon-512.png'));
await sharp(Buffer.from(sigil(192))).png().toFile(path.join(ICONS, 'icon-192.png'));
await sharp(Buffer.from(sigil(180, { rounded: false }))).png().toFile(path.join(ICONS, 'apple-touch-icon.png'));
await sharp(Buffer.from(sigil(512, { rounded: false, pad: 40 }))).png().toFile(path.join(ICONS, 'maskable-512.png'));

const DEVICES: [number, number, number][] = [
  [440, 956, 3],
  [420, 912, 3],
  [402, 874, 3],
  [430, 932, 3],
  [393, 852, 3],
  [428, 926, 3],
  [390, 844, 3],
  [375, 812, 3],
  [414, 896, 3],
  [414, 896, 2],
  [375, 667, 2],
];

const links: string[] = [];
for (const [w, h, dpr] of DEVICES) {
  const W = w * dpr;
  const H = h * dpr;
  const iconSize = Math.round(W * 0.32);
  const icon = await sharp(Buffer.from(sigil(iconSize, { rounded: true }))).png().toBuffer();
  const file = `splash-${W}x${H}.png`;
  await sharp({ create: { width: W, height: H, channels: 3, background: BG } })
    .composite([{ input: icon, left: Math.round((W - iconSize) / 2), top: Math.round((H - iconSize) / 2 - H * 0.04) }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(SPLASH, file));
  links.push(
    `<link rel="apple-touch-startup-image" href="splash/${file}" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)" />`,
  );
}

const indexPath = path.join(ROOT, 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');
const block = `<!-- SPLASH -->\n    ${links.join('\n    ')}\n    <!-- /SPLASH -->`;
fs.writeFileSync(indexPath, html.replace(/<!-- SPLASH -->[\s\S]*?(<!-- \/SPLASH -->|(?=\n))/, block));
console.log(`icons + ${links.length} splash screens`);
