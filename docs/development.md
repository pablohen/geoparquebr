# Development

## Prerequisites

- Node.js 24+ (developed on 26)
- pnpm 10+
- Either a MongoDB Atlas cluster or Docker (OrbStack, Docker Desktop, …) for a local MongoDB

## First run

```bash
pnpm install
cp .env.example .env
```

Set `MONGODB_URI` in `.env`, using one of these:

- **Local:** `docker compose up -d`, then `MONGODB_URI="mongodb://localhost:27017"`
- **Atlas:** the `mongodb+srv://…` string from *Connect → Drivers*. The database user needs `readWrite` on `MONGODB_DB`, and your IP must be in the Atlas network access list.

Then:

```bash
pnpm db:seed   # indexes + ~320 geosites from GEOSSIT (SGB/CPRM) + 3D model attachments
pnpm db:fossils   # fossil genus pages: records near each geosite, matched to GBIF (a few minutes)
pnpm dev       # http://localhost:3000
```

## Environment variables

| Variable | Required | Default | Used in |
| --- | --- | --- | --- |
| `MONGODB_URI` | yes | — | `src/lib/db.server.ts` |
| `MONGODB_DB` | no | `geoparquebr` | `src/lib/db.server.ts` |
| `SKETCHFAB_TOKEN` | only for `models:fetch` | — | `scripts/fetch-models.ts` |

Server code reads them through `process.env`. Nothing secret should ever use the `VITE_` prefix, because Vite inlines those values into the client bundle.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Vite dev server with SSR and HMR on port 3000; regenerates `src/routeTree.gen.ts` |
| `pnpm build` | Production build into `dist/client` and `dist/server` |
| `pnpm start` | Runs the Node.js production server from `.output/` (after `pnpm build`); see [deployment](deployment.md) |
| `pnpm i18n` | compiles `messages/*.json` into `src/paraglide/` (typed `m.*` functions); dev, build and tests do this themselves |
| `pnpm typecheck` | `pnpm i18n`, then `tsc --noEmit` |
| `pnpm lint` | `biome check .` (lint + format + import sorting) |
| `pnpm format` | `biome check --write .` |
| `pnpm test` | Vitest: unit tests, plus MongoDB integration tests when `MONGODB_URI` is set |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm db:seed` | `tsx --env-file=.env scripts/seed.ts`: indexes, GEOSSIT sync (upsert + prune) and 3D model attachments; safe to re-run |
| `pnpm db:fossils` | `tsx --env-file=.env scripts/fossils.ts`: refreshes every geosite's fossil records (`fossil_sites`) and rebuilds `fossil_genera` for the `/fossils` pages; run after `db:seed`, safe to re-run (production also refreshes daily) |
| `pnpm brand:images` | renders `public/og-default.png` (1200×630 share card) and the PWA icons from SVG; commit the output |
| `pnpm models:fetch` | downloads CC BY models from Sketchfab, optimizes them into `public/models/` (`--force` to refresh) |

## Checks before committing

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

`pnpm test` runs ~80 tests in under a second:

- **Unit:** geo helpers, taxon parsing, ICS colours, GEOSSIT mapping, model catalog, Photon parsing, and URL/schema fallbacks.
- **Integration:** viewport query, filters, text search, sensitive rounding, sync/prune, and the TTL cache. These run against `MONGODB_URI` in a throwaway database.

**Service worker.** It only registers in production builds. To test it: `pnpm build`, then run `node .output/server/index.mjs` with `MONGODB_URI` set, open it in real Chrome (the in-app browser pane doesn't support service workers), browse, then stop the server to see the offline behaviour. DevTools' "Offline" checkbox doesn't apply to service-worker fetches.

There are no browser end-to-end tests yet. For UI work, open the page and check:

- **Map:** pins render and the console shows no MapLibre worker errors.
- **List:** clicking an item opens the drawer, highlights the item and zooms the map.
- **Deep link:** loading a `?site=<slug>` URL directly opens the drawer and zooms the map.
- **3D tab:** the viewer renders and can be orbited by dragging.
- **Console:** no React warnings.

A headless or background browser tab may pause `requestAnimationFrame`. That freezes Mantine transitions and the R3F render loop, so check 3D and drawer animations in a foreground tab.

## Project layout

```
src/
├── routes/                       file-based routes (TanStack Router)
│   ├── __root.tsx                <html lang>, MantineProvider, global CSS, color-scheme script
│   ├── index.tsx                 explorer route: validateSearch → loader → UI
│   └── geosites.$slug.tsx        standalone geosite page
├── features/geosites/
│   ├── schemas.ts                Zod: single source of truth
│   ├── labels.ts                 enum values → localized labels
│   ├── geosites.server.ts        Mongo queries, indexes, DTO mapping, sync (server-only)
│   ├── geossit.server.ts         GEOSSIT fetch + Zod validation + mapping (server-only)
│   ├── model-catalog.server.ts   curated 3D models and where they attach (server-only)
│   ├── geosites.functions.ts     createServerFn RPCs
│   └── components/               Explorer, List, LocationForm, Map, Drawer, ModelViewer, SketchfabEmbed
├── features/geoparks/           geopark facts (geoparks.ts), queries, pages
├── features/i18n/components/     LanguageSwitcher, PageHeader
├── lib/db.server.ts              pooled MongoClient (cached on globalThis for HMR)
├── lib/i18n.ts                   locale helpers: localized URLs, hreflang, og:locale
├── paraglide/                    compiled messages (generated, git-ignored)
├── router.tsx                    getRouter() factory; /en, /es rewrite
├── server.ts                     server entry: Paraglide middleware
├── routeTree.gen.ts              generated, committed, not linted
└── theme.ts                      Mantine theme ("laterite" primary color)
scripts/seed.ts                   indexes + GEOSSIT sync + model attachments
scripts/fetch-models.ts           Sketchfab download → optimize → public/models/
scripts/lib/optimize-glb.ts       glTF-Transform pipeline (simplify, WebP, meshopt)
messages/{pt-BR,en,es}.json      UI copy (Paraglide / inlang message format)
project.inlang/                   inlang project settings (plugins from node_modules)
docs/                             these docs
```

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Blank map, console says "Worker failed to load" | `setWorkerUrl(workerUrl)` is missing or runs after a `Map` is created; see `GeositeMap.tsx` |
| `"default" is not exported by maplibre-gl` | MapLibre 6 has no default export; use named imports |
| Dev server shows "An error has occurred" / `Failed to load url /src/paraglide/messages/…` | `src/paraglide` was written in another layout (an old checkout, or a hand-run `paraglide-js compile` without the project's flags). Stop `pnpm dev`, run `rm -rf src/paraglide && pnpm i18n`, start it again |
| `Missing required env var MONGODB_URI` | `.env` missing, or the command didn't load it (`db:seed` uses `--env-file`) |
| `$geoNear requires a 2d or 2dsphere index` | Run `pnpm db:seed`, which creates `public_location_2dsphere` and fills `publicLocation` |
| `MongoServerSelectionError` against Atlas | IP not in the Atlas network access list, or a wrong user/password |
| React "Encountered a script tag" warning | Mantine's `ColorSchemeScript` came back; use `ScriptOnce` (see `__root.tsx`) |
| React "synchronously unmount a root" errors | drei `<Html>` inside the Canvas; move the overlay outside the Canvas |
| Fósseis tab says "SGB/CPRM: indisponível" | The SGB OGC API (experimental) or GBIF is down; the other source still shows. Results are cached for 7 days once fetched |
| Strata column shows the illustrative Araripe column | No units mapped within ~3 km, or the SGB API is down (the caption says which) |
| Stale fossil/strata data after changing a mapping | Bump the cache-key version in `geology.functions.ts`, or drop the `api_cache` collection |
| `GEOSSIT query failed` / TLS errors during `db:seed` | `geoportal.sgb.gov.br` is down or blocked. A proxy or sandbox that intercepts TLS can break the RNP/GlobalSign chain; check with `curl -v` |
| `Skipped GEOSSIT <id>: …` | That record failed validation and the rest still imported. Adjust the mapping or limits in `geossit.server.ts` / `schemas.ts` |
| Geosite photo missing | About 2% of GEOSSIT photo links 404 upstream; the drawer hides them |
| `SKETCHFAB_TOKEN is not set` | Add an API token from https://sketchfab.com/settings/password to `.env` |
| Search shows geosites but places arrive late or never | Photon (komoot's public instance) often takes 5–8 s, and its timeout is 12 s. Place search is independent and never blocks geosite results |
| Geology layer blank below zoom 4 | SGB's tile cache starts at web zoom 4, so zoom in |
| Biome errors in `routeTree.gen.ts` | It's excluded in `biome.json`; don't remove that entry |
