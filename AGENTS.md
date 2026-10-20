# AGENTS.md

Guidance for AI coding agents (and humans) working in this repository.

GeoparqueBR is a TanStack Start app for exploring Brazilian UNESCO Global Geoparks: geosites, strata, fossil beds and karst caves. It shows them in a list, on a MapLibre map and in a React Three Fiber 3D viewer. Data lives in MongoDB with a `2dsphere` index.

Deeper docs: [architecture](docs/architecture.md) · [data model](docs/data-model.md) · [development](docs/development.md) · [deployment](docs/deployment.md) · [3D models](docs/3d-models.md)

## Commands

Use **pnpm**, never npm or yarn.

| Task | Command |
| --- | --- |
| Install | `pnpm install` |
| Dev server (http://localhost:3000) | `pnpm dev` |
| Typecheck | `pnpm typecheck` |
| Lint + format check | `pnpm lint` |
| Auto-fix lint/format | `pnpm format` |
| Production build | `pnpm build` (Nitro: `.output/`, or `.vercel/output/` on Vercel) |
| Run production build | `pnpm start` |
| Tests (unit + MongoDB integration) | `pnpm test` (`pnpm test:watch` while developing) |
| Sync geosites from GEOSSIT + attach 3D models | `pnpm db:seed` (reads `.env`) |
| Regenerate share card + app icons | `pnpm brand:images` (commit the PNGs) |
| Download + optimize CC BY 3D models | `pnpm models:fetch` (needs `SKETCHFAB_TOKEN`) |
| Local MongoDB | `docker compose up -d` |

Before you call a change done, run `pnpm lint && pnpm typecheck && pnpm test && pnpm build`. For UI changes, also load the page and check the browser console.

## Tests

- **Vitest**, configured in `vitest.config.ts`, which is separate from the app's Vite config, so tests don't load the TanStack Start plugin. Tests live next to the code as `*.test.ts`.
- **Integration tests** are `*.integration.test.ts`. They need `MONGODB_URI` and are skipped without it. Each run uses a throwaway `geoparquebr_test_*` database and drops it afterwards.
- **What to test.** Keep parsing and mapping logic (GEOSSIT, taxa, Photon, schemas) pure and exported, so it can be tested without network access. Don't hit live external APIs in tests; feed them fixtures instead.
- **Bugs.** Add a regression test with every bug fix.

## Stack and versions

- **TanStack Start 1.x** (Vite 8 plugin). Server-function input validation is `.validator(schema)`. Read the bundled skill docs in `node_modules/@tanstack/react-start/skills/` and `node_modules/@tanstack/start-client-core/skills/` before guessing at APIs: they match the installed version.
- **Zod 4**: `z.url()`, `z.iso.datetime()` and so on, not the Zod 3 method forms.
- **Mantine 7** (pinned on purpose; npm `latest` is 9). Use Mantine components and style props before writing custom CSS.
- **Phosphor icons** (`@phosphor-icons/react`) for every icon.
- **React Hook Form** + `@hookform/resolvers/zod` for forms.
- **MapLibre GL 6** for maps; **React Three Fiber 9** + **drei 10** for 3D; **glTF-Transform** + meshoptimizer + sharp to optimize models (scripts only).
- **Biome 2**: default formatting (tabs, double quotes). Don't add style overrides.
- **TypeScript 7** (`tsc` is the native compiler), `strict` + `noUncheckedIndexedAccess`.

## Architecture rules

1. **Zod schemas are the single source of truth.** Domain shapes live in `src/features/<feature>/schemas.ts`, and they feed route `validateSearch`, server-function `.validator()`, form `zodResolver` and seed validation. Derive types with `z.infer`/`z.input`; never hand-write a duplicate interface.
2. **The server/client boundary is set by file name:**
   - `*.server.ts` holds server-only code (Mongo driver, secrets, `process.env`). **Never import it from components or routes.**
   - `*.functions.ts` wraps server-only code in `createServerFn`. It's safe to import anywhere, because the build swaps handlers for RPC stubs on the client.
   - Route loaders are isomorphic: call server functions from them, never the database directly.
3. **Feature folders.** New domain code goes in `src/features/<feature>/` (`schemas.ts`, `<feature>.server.ts`, `<feature>.functions.ts`, `components/`). Shared infrastructure goes in `src/lib/`.
4. **URL state.** Anything a user would want to share or bookmark (map center, radius, selected geosite) lives in route search params validated by Zod, not in `useState`.
5. **Mobile first-paint uses CSS.** Lay out phones with Mantine `hiddenFrom`/`visibleFrom` and responsive style props (`h={{ base, sm }}`). Use `useIsMobile()` only for behaviour (drawer position, dropdown width), since it returns `false` until hydration. Check every UI change at 375 px as well as desktop.
6. **Browser-only libraries load lazily.** MapLibre and three.js must sit behind `<ClientOnly>` + `React.lazy`, in a default-exported component, so they stay out of SSR and the initial bundle.

## Domain invariants

- GeoJSON coordinates are **`[longitude, latitude]`**, the reverse of most map UIs. `PositionSchema` enforces the ranges.
- The map viewport is the URL's `bbox` (`[west, south, east, north]`). Distances are in **metres** (`distanceMeters`, from the box centre); radii in forms and lookups are **kilometres**.
- `_id` and `Date` never leave the server. Map documents through `toDto` in `geosites.server.ts`, which returns `id: string` and ISO-string dates.
- Geosites with `locationIsSensitive: true` (fragile caves, fossil beds) get their coordinates rounded to about 1 km in `toDto`. Never add a code path that returns their exact coordinates to the client.
- The list query is `$geoNear` (first stage, needs `location_2dsphere`) with `$geoWithin` on a densified box polygon in its `query`. Return summaries only; the drawer fetches the full geosite by slug.
- Per-geosite lookups (fossils, strata) take a **slug** and resolve exact coordinates server-side via `findGeositeLocation`. Never accept coordinates from the client for them, and never return exact coordinates of sensitive sites.
- User-facing text is **Brazilian Portuguese**. Enum values stay English slugs, with pt-BR label maps (`GEOSITE_CATEGORY_LABELS`, `GEOPARK_LABELS`, `RELEVANCE_LABELS`, `DEGRADATION_RISK_LABELS`). Show labels, never raw enum values.

## External data

- Geosites are a mirror of **GEOSSIT** (SGB/CPRM). Don't hand-edit them in the database, because the next `pnpm db:seed` overwrites the changes. Fix mappings in `geossit.server.ts` instead. See [data model](docs/data-model.md#where-the-data-comes-from).
- The GEOSSIT ArcGIS layer advertises edit capabilities. **Only ever `query` it.**
- Validate every external record with Zod and skip bad records individually; never let one bad record abort a whole import.
- Credit sources in the UI: GEOSSIT (with a link to the site's GEOSSIT page) and each 3D model's `attribution`/`license`.
- **3D model provenance must be honest.** Only attach a model where you can justify the link, and set `provenance` (`locality` / `region` / `illustrative`) accordingly. Only CC BY models may be self-hosted; view-only ones use the Sketchfab embed. See [3D models](docs/3d-models.md).

- Upstream geology APIs (SGB OGC API, GBIF) are cached in `api_cache` through `cached()` (`src/lib/cache.server.ts`). Each source must fail independently, returning `status: "unavailable"`. Bump the cache-key version when a mapping changes.

## Pages, sharing and offline

- **Routes.** `/` is the map explorer. `/geossitios/$slug` is the indexable page for one geosite, server-rendered, with Open Graph, Twitter and JSON-LD built in `src/features/geosites/seo.ts`. `/sitemap.xml` is a server route. The public origin is `SITE_URL` in `src/lib/site.ts`.
- **Share images.** Only use a geosite's photo when `getGeositePage` confirms it loads, since about 2% of GEOSSIT links are dead; otherwise use `/og-default.png`.
- **Service worker** (`public/sw.js`, registered in production only). Bump `VERSION` whenever its caching rules change. Keep `/assets/*` cache-first (content-hashed), pages and `/_serverFn/*` network-first, and map tiles stale-while-revalidate.
- **Start URL.** The manifest `start_url` must be the default-viewport URL (`/?bbox=…`); `manifest.test.ts` keeps it in sync with `DEFAULT_BBOX`. A redirect (`/` → `/?bbox=…`) can't be served offline.
- **Testing offline.** The in-app browser pane doesn't support service workers, and CDP network emulation doesn't apply to service-worker fetches. Test with a production build in real Chrome and actually stop the server.

## Deployment

- Deployed on **Vercel in São Paulo (`gru1`)**, with MongoDB Atlas in **AWS `sa-east-1`**. Keep new infrastructure in Brazil.
- The function region and limits live in `vite.config.ts` (`nitro({ vercel: { functions } })`). Keep `maxDuration` above the slowest upstream timeout (Photon: 12 s) and MongoDB's `serverSelectionTimeoutMS` (10 s).
- Nitro is a pinned **beta** (`3.0.x-beta`). Upgrade deliberately and re-check `NITRO_PRESET=vercel pnpm build`.

## Known gotchas

- **MapLibre worker:** MapLibre 6 finds its web worker relative to its own module URL, and that breaks under Vite bundling. `GeositeMap.tsx` imports `maplibre-gl/dist/maplibre-gl-worker.mjs?url` and calls `setWorkerUrl` before creating a map. Keep that call if you refactor.
- **MapLibre 6 has no default export.** Use named imports (`Map`, `NavigationControl`, …).
- **SGB geology tiles** are an ArcGIS cache whose level 0 is web zoom 4. `GeositeMap` registers an `sgb-geology://` MapLibre protocol that subtracts the offset; a plain `{z}` URL template would request the wrong level, or 404.
- **Search lookups stay independent.** Photon place search is slow (5–8 s), so geosite and place search are separate server functions. Don't merge them into one `Promise.all` that the UI waits on.
- **No drei `<Html>`.** Each `<Html>` mounts its own React root, and React 19 logs "synchronously unmount a root" errors. Put overlays (legends, errors, loaders) in plain DOM outside the `<Canvas>`.
- **Color-scheme script:** don't use Mantine's `<ColorSchemeScript>`, which triggers a React 19 "script tag" warning on hydration. `__root.tsx` injects the same script with TanStack's `<ScriptOnce>`.
- **Don't gate MapLibre handlers on `map.loaded()`.** It's false whenever tiles are still streaming, i.e. right after most moves. `GeositeMap` keeps its own `ready` flag set in `on("load")`.
- **Viewport ↔ URL loop.** The map reports moves with history *replace*, and only re-fits when the URL `bbox` differs from the last value it emitted. Keep that guard, or fit→move→navigate will loop.
- **Map effects that need the style loaded** must also run inside `map.on("load")`. Effects that fire earlier find no layer and return early (deep-linked `?site=` relies on this).
- **`src/routeTree.gen.ts` is generated** by the TanStack Start plugin on dev and build. It's committed, but excluded from Biome. Don't edit it by hand.
- Env vars (`MONGODB_URI`, `MONGODB_DB`) are read with `process.env` in `*.server.ts` only. Never prefix secrets with `VITE_`.

## Git

- **Atomic [Conventional Commits](https://www.conventionalcommits.org/):** one logical change per commit, in the form `type(scope): summary` (types `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `perf`; scopes such as `geosites`, `map`, `viewer`, `db`, `app`).
- Every commit should pass `pnpm lint` and `pnpm typecheck` on its own. Order commits so nothing imports a file added in a later one.
- `public/models/*.glb` are generated by `pnpm models:fetch`. Decide on Git LFS or object storage before committing large binaries.
- Never commit `.env`. Add new variables to `.env.example` with a placeholder value.
