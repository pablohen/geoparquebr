# Data model

All shapes are defined once in [`src/features/geosites/schemas.ts`](../src/features/geosites/schemas.ts). This page explains them; the code is authoritative.

## Where the data comes from

The `geosites` collection is a mirror of **GEOSSIT**, the Geological Survey of Brazil's (SGB/CPRM) inventory of geosites and geodiversity sites. GEOSSIT is published as an ArcGIS FeatureServer layer:

```
https://geoportal.sgb.gov.br/server/rest/services/gestaoterritorial/geossit/FeatureServer/0
```

`pnpm db:seed` fetches every feature (about 320), validates each one with Zod, maps it to `GeositeInput`, adds a geological age from SGB's map (below), attaches 3D models from the [model catalog](3d-models.md), and upserts the result. The mapping lives in [`geossit.server.ts`](../src/features/geosites/geossit.server.ts).

- **Read-only.** The layer advertises edit capabilities; never call anything except `query`.
- **Idempotent.** Records are keyed by `source.{system,id}`. A re-run updates changed records and deletes the ones GEOSSIT dropped.
- **Validated per record.** An invalid feature is skipped with a reason printed, and the rest still import.
- **Credit.** Show "GEOSSIT — Serviço Geológico do Brasil (SGB/CPRM)" and link `source.url` wherever GEOSSIT data appears. The drawer does this.

### Geological age (from SGB's map)

GEOSSIT has no age field, so the seed derives `geologicAge` from SGB's lithostratigraphy map ([`geologic-age.server.ts`](../src/features/geosites/geologic-age.server.ts), mapping in [`geologic-age.ts`](../src/features/geosites/geologic-age.ts)):

1. If the geosite's own text names a unit ("…da Formacao Santana…") that the map shows within 5 km, use that unit.
2. Otherwise use the unit(s) under the point (~50 m box), on the most detailed map SGB has there (1:25k → 1:1M).

`mapScale` records the map's scale, and the UI labels the result "Rocha mapeada no local" with that scale. At 1:1M it is the bedrock at the point, which can differ from what a geosite showcases (Pedra Cariri's point falls on Archean basement). "0–0 Ma" placeholders on some units are ignored. Lookups are cached in `api_cache` for 180 days; if more than 10% fail, the seed stops before writing anything, so a SGB outage can't wipe stored ages.

### Field mapping

| GEOSSIT attribute | Our field | Notes |
| --- | --- | --- |
| `id_geossitio` | `source.id` | stable key |
| `nome` | `name`, `slug` | slug = kebab-case name; names that repeat in the inventory get `-<id>` appended |
| geometry (`outSR=4326`) | `location` | the server reprojects SAD 69 / Córrego Alegre / SIRGAS 2000 records to WGS 84. Don't use the `lat`/`long` attributes |
| `municipio`, `uf` | `municipality`, `state` | |
| `municipio` + `uf` | `geoparkId` | via the municipalities that legally make up each UNESCO geopark (see below) |
| `geoparque__proposta_` | `geoparkProposal` | free text, kept only when the site isn't in a UNESCO geopark |
| `tematica_principal` | `categories` (0–1 items) | 22 GEOSSIT themes → 17 categories; `"0"` → `[]` |
| `indicativo_de_relevancia` | `relevance` | international / national / geodiversity |
| `quantificacao_*` | `scores` | scientific, tourism, didactic, vulnerability (0–400) |
| `risco_de_degradacao` | `degradationRisk` | low / medium / high |
| `enquadramento_geologico`, `provincia_geologica` | `geology.setting`, `geology.province` | |
| `resumo` | `description`, `summary` | summary = leading sentences, at most 500 chars |
| `link_imagem_representativa` | `coverImageUrl` | rewritten to `https://www.sgb.gov.br/…`; about 2% of these links 404, and the UI hides them |
| `link_geossit` | `source.url` | same rewrite |
| `autores`, `ultima_edicao` | `source.authors`, `source.updatedAt` | |

**Geopark membership.** GEOSSIT's own geopark field is free text and incomplete: it marks the Romualdo Member as "Não" even though the site is inside Araripe. So `geoparkId` is assigned from municipality lists in `GEOPARK_MUNICIPALITIES`. Update those lists if a geopark's territory changes.

**Sensitive locations.** `locationIsSensitive` is set for speleological and paleontological sites and for anything with high degradation risk. Their coordinates are rounded to about 1 km in API responses.

## Collection: `geosites`

### Fields (`GeositeInputSchema`)

| Field | Type | Rules |
| --- | --- | --- |
| `slug` | string | kebab-case, 3–96 chars, **unique** |
| `name` | string | 2–240 chars |
| `summary` | string | ≤ 500 chars |
| `description` | string? | ≤ 20 000 chars |
| `geoparkId` | enum? | `araripe`, `serido`, `caminhos-dos-canions-do-sul`, `quarta-colonia`, `cacapava`, `uberaba` |
| `geoparkProposal` | string? | aspiring-geopark name from GEOSSIT |
| `municipality` | string | |
| `state` | string | 2-letter UF, upper-cased |
| `categories` | enum[] | see `GEOSITE_CATEGORIES` (17 values) |
| `relevance` | enum | `international`, `national`, `geodiversity` |
| `scores` | object? | `{ scientific, tourism, didactic, vulnerability }`, integers 0–400 |
| `degradationRisk` | enum? | `low`, `medium`, `high` |
| `geology` | object? | `{ setting?, province? }` |
| `geologicAge` | object? | `period`, `formation?`, `minMa?`, `maxMa?`, `mapScale?`; derived from SGB's map at seed time (see above) |
| `location` | GeoJSON Point | `{ type: "Point", coordinates: [lng, lat] }` |
| `models` | `Model3D[]` | max 20; see [3D models](3d-models.md) |
| `coverImageUrl` | url? | |
| `locationIsSensitive` | boolean | coordinates rounded to ~1 km in API responses |
| `publicLocation` | GeoJSON Point | stored only: `location` rounded when sensitive, written by the sync; client-steerable geo queries use it. Never returned |
| `source` | object? | `{ system: "geossit", id, url, authors?, updatedAt? }` |

### Document shape (in MongoDB)

`GeositeDoc` in `geosites.server.ts` is the parsed input plus `_id: ObjectId`, `createdAt: Date` (first import) and `updatedAt: Date` (the **last sync**, not the last upstream change; that's `source.updatedAt`). Absent optional fields are left out of the document entirely, because the client is configured with `ignoreUndefined`, rather than stored as `null`.

### API shapes (DTOs)

- `GeositeSchema` = input + `id: string`, with `createdAt`/`updatedAt` as ISO strings. The drawer loads it via `getGeositeBySlug`.
- `GeositeSummarySchema` is the light list/map record (id, slug, name, municipality, state, categories, relevance, geoparkId, location, locationIsSensitive) plus `distanceMeters` from the centre of the queried box.

`toDto()` and the summary mapper are the only paths from document to client, and they're where sensitive coordinates get rounded.

## Indexes

Created idempotently by `ensureGeositeIndexes()`, which `pnpm db:seed` calls:

| Name | Keys | Purpose |
| --- | --- | --- |
| `location_2dsphere` | `{ location: "2dsphere" }` | server-side lookups on exact points |
| `public_location_2dsphere` | `{ publicLocation: "2dsphere" }` | `$geoNear` + `$geoWithin` viewport and nearby queries |
| `slug_unique` | `{ slug: 1 }`, unique | lookups by slug |
| `geopark_categories` | `{ geoparkId: 1, categories: 1 }` | filtering per geopark and category |
| `source_unique` | `{ "source.system": 1, "source.id": 1 }`, unique, partial | sync upsert key |
| `text_search` | text on `name` (10), `municipality` (5), `description` (1); Portuguese | header search |

The `api_cache` collection (see [geology lookups](#geology-lookups)) has its own TTL index on `expiresAt`, created on first use.

## Queries

### Viewport: `findGeositesInBounds`

```ts
[
  {
    $geoNear: {
      near: { type: "Point", coordinates: bboxCenter(bbox) },
      key: "publicLocation",
      spherical: true,
      distanceField: "distanceMeters",
      query: {
        publicLocation: { $geoWithin: { $geometry: bboxPolygon(bbox) } },
        categories: { $in: categories }, // when filtered
        relevance,                       // when filtered
        geoparkId,                       // when filtered
        "geologicAge.maxMa": { $gt: young }, // age filter: overlaps
        "geologicAge.minMa": { $lt: old },   // the chosen periods
      },
    },
  },
  { $limit: limit },          // default 500, max 1000
  { $project: SUMMARY_FIELDS },
]
```

- **Public points only.** Matching and distances use `publicLocation`. On exact coordinates, a tiny box (in or out?) or distances from a few chosen centres would locate a sensitive site to the metre; the integration tests check both.
- `$geoNear` must be the first stage. It provides the nearest-to-centre ordering and the distance; `$geoWithin` inside its `query` restricts results to the viewport.
- `bboxPolygon` ([`src/lib/geo.ts`](../src/lib/geo.ts)) densifies the box edges every 1°. MongoDB treats polygon edges as geodesics, which would otherwise bow toward the pole on wide boxes.
- Only summary fields are projected, so a Brazil-wide view (~320 sites) stays small. The map clusters them client-side.

### By slug: `findGeositeBySlug`

`findOne({ slug })`, called through `getGeositeBySlug`, which throws TanStack Router's `notFound()` when nothing matches. Because the drawer loads by slug, a shared link opens the right geosite even when it lies outside the viewport or the active filters.

### Search: `searchGeosites`

This runs a `$text` search sorted by `textScore`, which matches whole stemmed words and is diacritic-insensitive. When that returns fewer than `limit` results, they're topped up with a case-insensitive, accent-stripped substring match on name, municipality and abstract, so partial input like "ptero" works. The query is regex-escaped. Place search (Photon/OSM) is a separate server function, so it never slows down geosite results.

### Nearby: `findNearbyGeosites`

`$geoNear` on `publicLocation` from the geosite's public point, up to 300 km, shortlists 20 others. `rankNearby` then rounds each distance to 100 m and keeps six. Distances to or from exact sensitive coordinates would let anyone triangulate a protected site from a few pages, so they never leave the server.

### Exact location: `findGeositeLocation`

This returns the **unrounded** coordinates. It's only for server-side lookups (fossils, strata); never return its result to the client.

## URL search params (`ExplorerSearchSchema`)

| Param | Type | Invalid input becomes |
| --- | --- | --- |
| `bbox` | `[west, south, east, north]` | `DEFAULT_BBOX` (Araripe + Rio do Peixe basin) |
| `cat` | category[] (≥ 1) | `undefined` (all) |
| `rel` | relevance? | `undefined` (all) |
| `gp` | geopark id? | `undefined` (all) |
| `age` | `[youngest, oldest]` period ids, e.g. `["cretaceous","jurassic"]` | `undefined` (all ages) |
| `site` | slug? | `undefined` |
| `tab` | `overview` \| `model` \| `fossils`? | `undefined` (overview) |
| `model` | int ≥ 0? | `undefined` (first entry); out-of-range indexes fall back to 0 |
| `geo` | `true`? | `undefined` (geology layer off) |

- **Map ownership.** The map writes `bbox` back on every move using history *replace*, so panning doesn't fill the back stack. It only re-fits to `bbox` when the value changes from outside (location form, back/forward).
- **What re-runs the loader.** Only `bbox`, `cat`, `rel`, `gp` and `age` are loader deps. `site`, `tab` and `model` are drawer state, fetched separately.
- **Drawer defaults.** Default values are left out of the URL. `tab` and `model` reset when another geosite is selected or the drawer closes.
- **Model indexes.** `model` indexes the geosite's models, followed by the mapped strata column as the last entry.

Every field uses `.catch()`, so a hand-edited or stale URL falls back to the defaults instead of erroring. Arrays are JSON-encoded by TanStack Router (e.g. `bbox=[-40.6,-7.9,-37.9,-6.3]`, URL-escaped).

## Geology lookups

These are per-geosite queries to public APIs, made by server functions in [`src/features/geology/`](../src/features/geology). The client sends a **slug**, never coordinates; the server resolves the exact location itself, so sensitive sites stay private. Each source fails independently and reports `unavailable` instead of failing the request. Results are cached in the `api_cache` collection.

| Lookup | Source | Radius | Cache | UI |
| --- | --- | --- | --- | --- |
| `getGeositeFossils` | SGB OGC API `geologia/ocorrencias-fossiliferas` (bbox, then haversine filter) | 5 km | 7 days | "Fósseis" tab |
| `getGeositeFossils` | GBIF `occurrence/search?geoDistance=…&basisOfRecord=FOSSIL_SPECIMEN` (first 100) | 5 km | 7 days | "Fósseis" tab |
| `getGeositeStrata` | SGB OGC API `geologia/litoestratigrafia/{25000…1000000}` with `skipGeometry` | ~3 km box | 30 days | 3D tab, "Coluna estratigráfica" |
| `getGeologyAt` | same API, 1:1,000,000 only (matches the map layer) | ~50 m box at a clicked point | 30 days, per ~100 m | geology layer identify card |

**Fossil records.** Taxa recorded in ALL CAPS are sentence-cased. Comma-separated authorship years ("Dastilbe elongatus Santos, 1947") are kept with their name rather than split into fake taxa. For sensitive geosites, distances are rounded to whole kilometres. GBIF licences vary per record (CC0 / CC-BY / CC-BY-NC), and each card shows its own.

**Strata.** Detailed scales cover only parts of Brazil. The lookup uses the most detailed scale with any unit and falls back to 1:1,000,000, which covers the whole country. Units are deduplicated by code and ordered youngest (top) → oldest (base), coloured with ICS colours by mid-age ([`time-scale.ts`](../src/features/geology/time-scale.ts)). The map has no thickness data, so the column's thicknesses are illustrative, and the UI says so.

Cache keys are versioned (`fossils:sgb:v2:<slug>`). Bump the version when the mapping changes, so stale entries are ignored and expire on their own.

## Other open data sources (not used yet)

| Source | What it would add |
| --- | --- |
| Overpass (`natural=cave_entrance`) | ~590 cave entrances in Brazil from OpenStreetMap |
| SGB ArcGIS `geologia/*` MapServers | geology map tiles for a map overlay |
