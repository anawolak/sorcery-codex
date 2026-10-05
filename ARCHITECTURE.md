# Architecture

The app has no classes. It is built from **Preact function components**, **modules holding state** (with a small subscribe/notify pattern) and **pure functions**. Data is prepared ahead of time in `scripts/`, and the app in `src/` only reads it.

```
sorcerytcg.com ──► scripts/ (Node, GitHub Action, daily)
                     fetch-all → build-index → fetch-images
                                   │
                                   ▼
                     public/data/db.json + public/cards/*.webp
                                   │
                                   ▼
                     src/ (Preact PWA, offline in the browser)
```

## Data pipeline (`scripts/`)

| File | Role |
| --- | --- |
| `lib.ts` | Shared helpers. Paths (`ROOT`, `RAW`, `OUT`), `fetchWithRetry` with backoff, `extractRscPayload` and `extractDatasets` (pull the Codex and FAQ JSON out of the Next.js RSC payload of a page), `portableToBlocks` (Sanity portable text → `Block[]`), `MARKUP` (regex for the `[[Card]]`, `((term))` and `))no-link((` markers), `blocksToText`, `slugify`. |
| `fetch-all.ts` | Fetches the sources into `data/raw/`. **Cards** come from `api.sorcerytcg.com/api/cards`. **Codex + FAQ** come from a single page, `/codex`, whose RSC payload holds all 212 entries and 753 FAQ. The **rulebook** link is found on `/how-to-play`; the PDF is downloaded from Google Drive (with a fallback to the cached copy). `parseRulebook` splits the PDF into sections by font size, groups text into lines and columns, and drops diagram callouts and page numbers. |
| `build-index.ts` | Normalizes the data into `public/data/db.json` and builds the **relationship graph**. A term matcher (Codex aliases, longest match first) links cards → Codex terms, Codex → cards / FAQ / rulebook sections, and FAQ → terms / cards. Terms are ranked by IDF (rare = more specific). A term is marked `generic` when interlinking is turned off for it or it appears on more than 20% of cards. The `version` is a content hash, so the file is deterministic. |
| `fetch-images.ts` | Downloads the primary printing of each card and saves it as WebP (380 px, ~34 KB) in `public/cards/`. Images that are no longer used are removed. |
| `icons.ts` | Generates the app icons and the iOS launch screens from one SVG, and writes the `apple-touch-startup-image` links into `index.html` between the `<!-- SPLASH -->` markers. |

## App (`src/`)

### Core

| File | Role |
| --- | --- |
| `types.ts` | The data model: `Card`, `CodexEntry` (+ `CodexSub`), `Faq`, `RuleSection`, `Block` / `Span` (rich text), `DB`. Shared by the scripts and the app. |
| `main.tsx` | Startup: PWA → load the database → search index → router → render → image download in the background → visit counter. |
| `app.tsx` | `App` is the root. `View` maps a route to a screen. Also holds `TabBar` (5 tabs), `UpdateToast` (update states: available → almost done → updated) and `useEdgeSwipeBack` (back gesture from the left edge, because a home-screen app has no swipe-back of its own). |
| `router.ts` | Hash router with a history stack. `history.state.idx` tells forward (push) from back (pop), scroll position is remembered per entry, and route changes render synchronously inside `document.startViewTransition` (iOS-style slide animations). API: `navigate`, `back`, `selectTab`, `setQueryParam`. |
| `data.ts` | `loadStore` / `getStore` keep the loaded `db.json` plus maps by slug, id and name. `resolveLink` turns a link label into a route (card, Codex entry, sub-section). Text helpers: `plain`, `blocksText`, `firstParagraph`. |

### Search (`src/search/`)

| File | Role |
| --- | --- |
| `engine.ts` | A single MiniSearch index over 4 document types: `card`, `codex` (with sub-sections), `faq`, `rule`. Matches prefixes and typos. Score boosts: exact title ×6, title prefix ×2.5, Codex alias ×3, plus per-type weights. Falls back from AND to OR when there are too few results. `snippet` cuts the excerpt around the match. |
| `suggest.ts` | The "smart suggestions". `detectEntities` finds card names and Codex terms in a free-text question (longest phrase first, plural tolerance, dropping `generic` terms when something more specific is present). `related` builds the panel: definitions, FAQ ranked by coverage of the detected topics plus text relevance, and rulebook sections. |

### State and services

| File | Role |
| --- | --- |
| `offline.ts` | Downloads all card images into the `card-images` cache (6 at a time, with progress), asks for persistent storage, removes stale images. `autoDownload` runs at startup. |
| `pwa.ts` | Registers the service worker (Workbox), shows the update prompt, checks for updates when the app returns to the foreground. |
| `pins.ts` | Pinned items (searches and pages) and Recent (max 5) in `localStorage`. `usePins` re-renders components when they change. |
| `visits.ts` | GoatCounter visit counter. One visit = an app open or a return after 30+ minutes; offline visits are queued. `useVisitTotal` reads the public total and caches it for offline use. |

### Components (`src/components/`)

| File | Components |
| --- | --- |
| `Icons.tsx` | SVG icons, `ElementGlyph` (alchemical element symbols), `AppLogo`. |
| `NavBar.tsx` | `NavBar` (back button, title that fades in on scroll), `LargeTitle` (large title on tab screens), `useScrolled`. |
| `Rows.tsx` | List building blocks: `Group`, `CardRow`, `LinkRow`, `RuleRow`, `FaqItem` (FAQ expanding inline), `TermChips`, `CardStrip`, `CardThumb`, `Threshold`, `CostBadge`, `Highlight`. |
| `RichText.tsx` | `RichText` renders `Block[]` (paragraphs, lists, damage grids, link markers). `TermText` makes Codex terms tappable in plain text (card text, rulebook). |
| `Sheet.tsx` | `SheetHost` + `openTermSheet`: a bottom sheet with a term's definition, dismissed by swiping down. |
| `ImageViewer.tsx` | Fullscreen card view: pinch-to-zoom, panning, double tap, swipe down to close, loads the high-resolution image when online. |
| `PinButton.tsx` | Pin toggle for a page or a search. |

### Screens (`src/views/`)

| File | Screen |
| --- | --- |
| `SearchView.tsx` | Home and search: header, search field, filters (All / Cards / Codex / FAQ / Rulebook), Pinned, Recent, the suggestions panel, results grouped by type. |
| `CardView.tsx` | Card: image, stats, text with term links, FAQ, mentions in other FAQ, printings. |
| `CardsView.tsx` | Card grid with filters (element, type, set, sort) and loading in pages. |
| `CodexView.tsx` | `CodexIndexView` (A–Z with a letter scrubber), `CodexEntryView` (entry + sub-sections, rulebook, FAQ, cards), `FaqView`. |
| `RulesView.tsx` | `RulesIndexView` (table of contents by chapter), `RuleView` (section, term links, previous/next). |
| `MoreView.tsx` | Offline status, storage use, data, visits, theme, sources. `OfflinePill` is the progress bar on the home screen. |
| `NotFound.tsx` | Fallback for a bad link. |

### Styles

`styles.css`: color tokens for the dark and light themes (`:root`, `prefers-color-scheme`, `data-theme`), safe-area insets, translucent bars, lists in the iOS style, the sheet, the image viewer and the view-transition animations.

## Build and deploy

- `vite.config.ts`: Preact, the PWA manifest, and Workbox. The app shell and `db.json` are precached; card images, other printings and launch screens are cached at runtime.
- `.github/workflows/deploy.yml`: runs daily, on push and manually. It fetches the data, builds the database and images, builds the app and deploys to GitHub Pages at `sorcery.anastory.com`.
