# Sorcery Codex

An iPhone-first, fully offline PWA for **Sorcery: Contested Realm**: every card (with images), the official Codex, all card FAQ and the rulebook. You search all of it from one box, and related rulings are suggested as you type.

Add it to the iPhone home screen (Safari → Share → *Add to Home Screen*). It launches fullscreen like a native app and works in airplane mode.

## How it works

| Step | Script | Output |
| --- | --- | --- |
| Fetch sources | `npm run data` | `data/raw/` — cards from `api.sorcerytcg.com`, Codex + FAQ from the RSC payload of `sorcerytcg.com/codex` (one request contains all of it), rulebook PDF → text sections |
| Build database | `npm run data:index` | `public/data/db.json` — normalized data + relationship graph (card ↔ Codex term ↔ FAQ ↔ rulebook section) |
| Card images | `npm run images` | `public/cards/*.webp`, 380 px, ~35 KB each (~37 MB total) |
| App | `npm run build` | `dist/` — Preact + MiniSearch, Workbox service worker |

`npm run setup` runs the first three steps. `npm run icons` regenerates the icons and iOS launch screens.

**Search.** A single MiniSearch index covers cards, Codex entries and their sub-sections, FAQ and rulebook sections. It does prefix and fuzzy matching and boosts exact titles.

**Smart suggestions** (`src/search/suggest.ts`):
- Card names and Codex terms/aliases are detected inside free-text questions, e.g. *"can airborne minions intercept stealth"* → Airborne, Intercept, Stealth.
- The app then shows each definition, the FAQ that cover the most of those topics (blended with text relevance), and the matching rulebook sections.
- In card text, keywords can be tapped to open a definition sheet.

**Offline.** The service worker precaches the app shell and `db.json`. On first launch the app downloads every card image into the `card-images` cache, with progress shown in the app. It also asks for persistent storage.

**Updates.** A GitHub Action rebuilds the data daily. `db.json` is deterministic, so the service worker only offers an update ("New cards & rulings available") when the content actually changed.

## Deploy (GitHub Pages)

1. Push this folder to a GitHub repo.
2. Go to *Settings → Pages → Source: GitHub Actions*.
3. `.github/workflows/deploy.yml` builds on push, every day at 05:17 UTC, and on manual dispatch.

The app uses relative paths and hash routing, so it works under `https://<user>.github.io/<repo>/`.

## Local development

```bash
npm install
npm run setup
npm run dev
```

## Known limitations

- Rulebook diagrams are not included (text only). The glossary and quick-reference pages are skipped because the Codex covers them with better data.
- Only the primary printing of each card is stored offline. Other printings load from the CDN and are cached after the first view.
- The scraper relies on the current sorcerytcg.com page structure. If they change it, `npm run data` fails loudly instead of publishing empty data.

Unofficial fan project for personal use. Sorcery: Contested Realm, card images and rules text © Erik’s Curiosa Limited.
