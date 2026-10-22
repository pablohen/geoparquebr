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
| Typecheck (compiles messages first) | `pnpm typecheck` |
| Compile messages into `src/paraglide` | `pnpm i18n` (dev, build and tests also do it) |
| Lint + format check | `pnpm lint` |
| Auto-fix lint/format | `pnpm format` |
| Production build | `pnpm build` (Nitro: `.output/`, or `.vercel/output/` on Vercel) |
| Run production build | `pnpm start` |
| Tests (unit + MongoDB integration) | `pnpm test` (`pnpm test:watch` while developing) |
| Sync geosites from GEOSSIT + attach 3D models | `pnpm db:seed` (reads `.env`; production also syncs weekly via Vercel Cron) |
| Rebuild geopark outlines for the map | `pnpm geo:outlines` (IBGE shapefiles; commit `public/data/geopark-outlines.geojson`) |
| Rebuild the fossil genus index (`/fossils`) | `pnpm db:fossils` (after `db:seed`; production also refreshes it daily via Vercel Cron) |
| Regenerate share card + app icons | `pnpm brand:images` (commit the PNGs) |
| Download + optimize CC BY 3D models | `pnpm models:fetch` (needs `SKETCHFAB_TOKEN`) |
| Local MongoDB | `docker compose up -d` |

Before you call a change done, run `pnpm lint && pnpm typecheck && pnpm test && pnpm build`. For UI changes, also load the page and check the browser console.

## Tests

- **Vitest**, configured in `vitest.config.ts`, which is separate from the app's Vite config, so tests don't load the TanStack Start plugin. Tests live next to the code as `*.test.ts`.
- **Integration tests** are `*.integration.test.ts`. They need `MONGODB_URI` and are skipped without it. Each file uses its own throwaway database from `testDbName()` (`src/lib/test-db.ts`; files run in parallel, so a timestamp alone collides) and drops it afterwards. `vitest.config.ts` loads `.env`, so pass `MONGODB_URI=mongodb://localhost:27017` explicitly or integration tests run against whatever `.env` points at.
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
- The list query is `$geoNear` (first stage, on `publicLocation`, needs `public_location_2dsphere`) with `$geoWithin` on a densified box polygon in its `query`. **Any query a client can steer (boxes, centres, distances) must use `publicLocation`, never `location`:** matching or measuring on exact points leaks sensitive sites. Return summaries only; the drawer fetches the full geosite by slug.
- **Distances to sensitive sites** are measured between public (rounded) points and rounded to 100 m, as in `rankNearby`. Never return a distance measured from or to exact sensitive coordinates: a few of them pin the site down.
- **Geological ages are map-derived or curated.** `geologicAge` comes from SGB's map at seed time (`mapScale` set; show it as the rock mapped at the site, with the scale), or from `age-catalog.server.ts` with a published `reference` (show the source). Never curate an age without a citable source.
- **Fossil genera come from the GBIF backbone.** `pnpm db:fossils` keeps only exact GBIF matches at genus rank or below (never fuzzy: Portuguese descriptions fuzzy-match unrelated genera), and `fossil_genera` stores geosites, never specimen coordinates.
- Per-geosite lookups (fossils, strata) take a **slug** and resolve exact coordinates server-side via `findGeositeLocation`. Never accept coordinates from the client for them, and never return exact coordinates of sensitive sites.
- **Three languages:** Brazilian Portuguese (default), English and Spanish. Enum values stay English slugs; show labels from `labels.ts` (`categoryLabel`, `geoparkLabel`, `relevanceLabel`, …), never raw enum values. Data from GEOSSIT, SGB and GBIF stays as published (Portuguese).

## Localization

- **Paraglide JS 2.** UI copy lives in `messages/pt-BR.json` (base), `messages/en.json` and `messages/es.json` and compiles to typed `m.*` functions in `src/paraglide/` (git-ignored; import from `~/paraglide/messages.js`). Never hard-code copy in components: `no-hardcoded-copy.test.ts` fails on it. Add every key to every file (`messages.test.ts` checks keys and placeholders match). To add a locale: list it in `project.inlang/settings.json`, add its catalog, and extend `OG_LOCALES`, `LOCALE_NAMES` and `LOCALE_CODES` (`src/lib/i18n.ts`), the `/offline.html` copy and the service worker's page pattern.
- **The URL is the locale.** pt-BR at the root (`/`, `/geosites/pedra-cariri`), English under `/en`, Spanish under `/es`. Routes are written without a locale: the router's `rewrite` (`router.tsx`) strips the prefix on the way in and adds it back to every link, and `src/server.ts` runs requests in `paraglideMiddleware` so SSR resolves the right locale. Don't add a `$locale` route param.
- **Call messages at render time**, not at module load: the server renders every language, so a module-level `const X = m.foo()` would freeze one of them.
- **Plurals** use the message-format `match` form with `count=0` kept plural (CLDR makes 0 singular in Portuguese); see `sheet_count`.
- **Server functions** run under `/_serverFn/`, which has no locale prefix, so they always see pt-BR. Return data, never copy.
- The inlang plugins load from `node_modules` (`project.inlang/settings.json`), not a CDN; the build's `catalogGuard` fails if any message failed to compile.
- **Every compiler writes the same `src/paraglide`.** `pnpm dev`, `pnpm test`, `pnpm build` and `pnpm i18n` (run by `pnpm typecheck`) all use `outputStructure: "locale-modules"` and don't wipe the folder first (`cleanOutdir: false` / `--no-clean-outdir`); `paraglide-config.test.ts` checks it. Otherwise a typecheck or build swaps the folder's layout under a running dev server and breaks it ("Failed to load url …/messages/…", 500s).
- **SEO:** canonical, `og:url` and share links follow the current locale (`absoluteUrl`), pages list hreflang alternates (`alternateLinks`), and the sitemap lists every page in every language. Only one `og:locale`: TanStack's head keeps one meta per property, so `og:locale:alternate` repeats would collapse.

## External data

- Geosites are a mirror of **GEOSSIT** (SGB/CPRM). Don't hand-edit them in the database, because the next `pnpm db:seed` overwrites the changes. Fix mappings in `geossit.server.ts` instead. See [data model](docs/data-model.md#where-the-data-comes-from).
- The GEOSSIT ArcGIS layer advertises edit capabilities. **Only ever `query` it.**
- Validate every external record with Zod and skip bad records individually; never let one bad record abort a whole import.
- Credit sources in the UI: GEOSSIT (with a link to the site's GEOSSIT page) and each 3D model's `attribution`/`license`.
- **3D model provenance must be honest.** Only attach a model where you can justify the link, and set `provenance` (`locality` / `region` / `illustrative`) accordingly. Only CC BY models may be self-hosted; view-only ones use the Sketchfab embed. See [3D models](docs/3d-models.md).

- Upstream geology APIs (SGB OGC API, GBIF) are cached in `api_cache` through `cached()` (`src/lib/cache.server.ts`). Each source must fail independently, returning `status: "unavailable"`. Bump the cache-key version when a mapping changes.

## Pages, sharing and offline

- **Routes.** `/` is the map explorer. `/geoparks` and `/geoparks/$geoparkId` are the geopark pages (`src/features/geoparks/`); designation years and map areas live in `geoparks.ts`, descriptions in messages. `/fossils` and `/fossils/$genus` are the fossil genus pages (`src/features/fossils/`), read from `fossil_genera`. Embeddable maps for other sites live at `/embed/geoparks/$geoparkId` and `/embed/geosites/$slug` (`src/features/embed/`; public points only, credit bar, no app chrome). Printable field guides live at `/geoparks/$geoparkId/guide` and `/trip/guide` (`src/features/guide/`); their QR codes and coordinates use public points only. `/news` ("Novidades") and its RSS (`/news.xml`) list what each GEOSSIT sync changed (`src/features/news/`, `geosite_changes`). `/stats` ("Números"), `/timeline` (geosites by geological period) and `/geoparks/compare` share one aggregation in `src/features/stats/` (no coordinates); a geosite counts in every period its dated age overlaps, the same rule as the map's age filter, so their map links show the geosites they counted. `/rankings` lists the top geosites by each GEOSSIT score (`src/features/rankings/`; ties share a place, `?by=&gp=&uf=` in the URL). `/glossary` (`src/features/glossary/`) defines the app's terms with stable anchors (`themeAnchor`, `scoreAnchor`) that theme badges and the score section link to; add an entry there when a page introduces a new term. `/states` and `/states/$uf` (`src/features/states/`; lower-case code in the URL, 404 for states without geosites) count a state's geosites and frame its map from public points only; state names are proper nouns in `states.ts`, the same in every language. `/regions` and `/regions/$region` (IBGE's five regions, `REGIONS` in `states.ts`; names in messages) compare a region's states. `/units` and `/units/$slug` (`src/features/units/`) are the rock units the SGB map names at geosites, split on contacts (" / "); a unit's age is read only from geosites where it is the only unit mapped, never from contacts. `/conservation` lists geosites at high GEOSSIT degradation risk with visiting guidance. Geosite pages add "Parecidos em outros estados" (`similar.ts`: shared themes ×2, shared periods ×1, other states only). The map's "Nota mínima" filter (`sk`, `sm`) matches `scores.<key> >= min`; offline lists return nothing for it, as for the age filter. The geosite of the day (`src/features/daily/`) hashes the São Paulo date into the sorted geosites with a photo, so it needs no stored state; it also leads `/news.xml`. `/compare?a=&b=` (`src/features/compare/`, `noindex`) puts two geosites side by side; each geosite's "Comparar" action opens it. Geopark and state pages show suggested 1- and 2-day itineraries (`trip/itineraries.ts`: the best tourism group around one of the top five, ≤50 km / ≤120 km, ordered with `suggestOrder`, public points) that load into the trip. The map's "Cores por idade" switch (`?pins=age`) colours pins by `pinPeriod` (the period at the middle of the dated range); summaries carry that period, never the age itself. The map's "Camadas" menu (`?ov=`, `overlays.ts` + `overlay-layers.ts`) adds GBIF fossil density (hex bins, detail capped at zoom 9 so no single specimen shows), contour lines (`maplibre-contour`, computed in a worker from the relief tiles), geopark outlines (`public/data/geopark-outlines.geojson`, built by `pnpm geo:outlines` from IBGE's per-state shapefiles and `GEOPARK_MUNICIPALITIES`) and SGB mineral occurrences (SGB's own rendering and legend); each source is added only when switched on. The header search also matches states and regions (client, `states/search.ts`) and rock units (`searchUnitsFn`, its own request). `/geosites/$slug` is the indexable page for one geosite, server-rendered, with Open Graph, Twitter and JSON-LD built in `src/features/geosites/seo.ts`. `/sitemap.xml` is a server route. The public origin is `SITE_URL` in `src/lib/site.ts`.
- **Share images.** Geosite and geopark pages share a generated 1200×630 card from `/og/geosites/$slug` and `/og/geoparks/$geoparkId`; state, region and unit pages from `/og/states/$uf`, `/og/regions/$region` and `/og/units/$slug`, and listing pages from `/og/pages/$page` (`CARD_PAGES`, `page-cards.server.ts`) (`src/features/share/share-card.server.tsx`: satori → resvg-wasm, Inter and the wasm inlined with `?base64` imports). Cards follow the URL's locale, carry no photo (it would push the PNG past WhatsApp's ~300 KB limit) and never draw a map or coordinates. Structured data still uses a geosite's photo, but only when `getGeositePage` confirms it loads (about 2% of GEOSSIT links are dead).
- **Service worker** (`public/sw.js`, registered in production only). Bump `VERSION` whenever its caching rules or page paths change. `/offline.html` switches language under `/en` and `/es`. Keep `/assets/*` cache-first (content-hashed), pages and `/_serverFn/*` network-first, and map tiles stale-while-revalidate.
- **Start URL.** The manifest `start_url` must be the default-viewport URL (`/?bbox=…`); `manifest.test.ts` keeps it in sync with `DEFAULT_BBOX`. A redirect (`/` → `/?bbox=…`) can't be served offline.
- **Offline geoparks and device data.** "Salvar para uso offline" pre-caches a geopark (pages via the service worker's `cache-pages` message, data via the same server-function calls the UI makes, tiles via `tileUrls`) and keeps its geosites in localStorage for the map's offline list fallback. Favourites, visits and the trip (`src/features/trip/`) are localStorage only (`createLocalStore`); never add a server copy of them without an explicit privacy decision. Trip stops use public points, and "start from my location" stays on the device. The GPX/KML export (`trip/export.ts`) is built on the device from those public points. The "Instalar app" button (`src/features/install/`) catches `beforeinstallprompt` at module load, since it can fire before hydration; iOS Safari gets an Add to Home Screen hint instead. Anything that reads localStorage renders after mount (`useMounted`) or via `useSyncExternalStore`'s empty server snapshot.
- **Testing offline.** The in-app browser pane doesn't support service workers, and CDP network emulation doesn't apply to service-worker fetches. Test with a production build in real Chrome and actually stop the server.

## Deployment

- Deployed on **Vercel in São Paulo (`gru1`)**, with MongoDB Atlas in **AWS `sa-east-1`**. Keep new infrastructure in Brazil.
- The function region, limits and the weekly sync cron live in `vite.config.ts` (`nitro({ vercel: { functions, config } })`). The sync (`sync.server.ts`) is shared by `pnpm db:seed` and `/api/cron/sync-geosites`; keep its guards (truncated GEOSSIT response, failed age lookups) so it stays safe unattended. `/api/cron/sync-fossils` (daily) refreshes the stalest geosites' fossil records for ~35 s and rebuilds the genus pages only when 90% of geosites have records. Keep `maxDuration` above the slowest upstream timeout (Photon: 12 s) and MongoDB's `serverSelectionTimeoutMS` (10 s).
- Nitro is a pinned **beta** (`3.0.x-beta`). Upgrade deliberately and re-check `NITRO_PRESET=vercel pnpm build`.

## Known gotchas

- **Contrast in light mode.** `theme.ts` uses primary shade 8 in both schemes and darkens every colour's light-variant text (badges, light buttons); shade 6 orange and Mantine's default light badges miss 4.5:1. `theme.test.ts` checks it. Check new pages with axe in both schemes.

- **Map credits fold after 5 s** (`autoHideAttribution` in `src/lib/map-attribution.ts`, the explorer and embeds): MapLibre's compact attribution only folds on drag otherwise. Keep it compact; the credits must stay one tap away.
- **MapLibre worker:** MapLibre 6 finds its web worker relative to its own module URL, and that breaks under Vite bundling. `GeositeMap.tsx` imports `maplibre-gl/dist/maplibre-gl-worker.mjs?url` and calls `setWorkerUrl` before creating a map. Keep that call if you refactor.
- **MapLibre 6 has no default export.** Use named imports (`Map`, `NavigationControl`, …).
- **Relief and 3D terrain** come from AWS Open Data "Terrain Tiles" (`encoding: "terrarium"`; MapLibre assumes Mapbox encoding and silently draws noise otherwise). Relief shading is always on; "Relevo 3D" (`?terrain=true`) adds terrain and tilts the map. A tilted map reports `flatBBox` (the untilted view at the same centre and zoom) as its `bbox`, or the list would reach the horizon.
- **SGB geology tiles** are an ArcGIS cache whose level 0 is web zoom 4. `GeositeMap` registers an `sgb-geology://` MapLibre protocol that subtracts the offset; a plain `{z}` URL template would request the wrong level, or 404.
- **Search lookups stay independent.** Photon place search is slow (5–8 s), so geosite, fossil genus and place search are separate server functions, and geoparks are matched on the client (`matchGeoparks`). Don't merge them into one `Promise.all` that the UI waits on.
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
