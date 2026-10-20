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
pnpm db:seed   # creates indexes + 7 sample geosites (coordinates are approximate)
pnpm dev       # http://localhost:3000
```

## Environment variables

| Variable | Required | Default | Used in |
| --- | --- | --- | --- |
| `MONGODB_URI` | yes | — | `src/lib/db.server.ts` |
| `MONGODB_DB` | no | `geoparquebr` | `src/lib/db.server.ts` |

Server code reads them through `process.env`. Nothing secret should ever use the `VITE_` prefix, because Vite inlines those values into the client bundle.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Vite dev server with SSR and HMR on port 3000; regenerates `src/routeTree.gen.ts` |
| `pnpm build` | Production build into `dist/client` and `dist/server` |
| `pnpm start` | `vite preview` of the production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | `biome check .` (lint + format + import sorting) |
| `pnpm format` | `biome check --write .` |
| `pnpm db:seed` | `tsx --env-file=.env scripts/seed.ts`: indexes plus sample-data upsert, safe to re-run |

## Checks before committing

```bash
pnpm lint && pnpm typecheck && pnpm build
```

There's no automated test suite yet. For UI work, open the page and check:

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
│   ├── __root.tsx                <html>, MantineProvider, global CSS, color-scheme script
│   └── index.tsx                 explorer route: validateSearch → loader → UI
├── features/geosites/
│   ├── schemas.ts                Zod: single source of truth
│   ├── geosites.server.ts        Mongo queries, indexes, DTO mapping (server-only)
│   ├── geosites.functions.ts     createServerFn RPCs
│   └── components/               Explorer, List, LocationForm, Map, Drawer, ModelViewer
├── lib/db.server.ts              pooled MongoClient (cached on globalThis for HMR)
├── router.tsx                    getRouter() factory
├── routeTree.gen.ts              generated, committed, not linted
└── theme.ts                      Mantine theme ("laterite" primary color)
scripts/seed.ts                   indexes + sample data
docs/                             these docs
```

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Blank map, console says "Worker failed to load" | `setWorkerUrl(workerUrl)` is missing or runs after a `Map` is created; see `GeositeMap.tsx` |
| `"default" is not exported by maplibre-gl` | MapLibre 6 has no default export; use named imports |
| `Missing required env var MONGODB_URI` | `.env` missing, or the command didn't load it (`db:seed` uses `--env-file`) |
| `$geoNear requires a 2d or 2dsphere index` | Run `pnpm db:seed`, or create `location_2dsphere` in Atlas |
| `MongoServerSelectionError` against Atlas | IP not in the Atlas network access list, or a wrong user/password |
| React "Encountered a script tag" warning | Mantine's `ColorSchemeScript` came back; use `ScriptOnce` (see `__root.tsx`) |
| React "synchronously unmount a root" errors | drei `<Html>` inside the Canvas; move the overlay outside the Canvas |
| Biome errors in `routeTree.gen.ts` | It's excluded in `biome.json`; don't remove that entry |
