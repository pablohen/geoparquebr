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

`mapScale` records the map's scale, and the UI labels the result "Rocha mapeada no local" with that scale. At 1:1M it is the bedrock at the point, which can differ from what a geosite showcases (Pedra Cariri's point falls on Archean basement).
3. A **curated age** in [`age-catalog.server.ts`](../src/features/geosites/age-catalog.server.ts) replaces both. Entries are keyed by GEOSSIT id, carry a published `reference` (shown as the source in the overview) and no `mapScale`. Add one only with a source that dates the unit the geosite showcases; Pedra Cariri is the first. "0–0 Ma" placeholders on some units are ignored. Lookups are cached in `api_cache` for 180 days; if more than 10% fail, the seed stops before writing anything, so a SGB outage can't wipe stored ages.

### Field mapping

| GEOSSIT attribute                                | Our field                             | Notes                                                                                                                |
| ------------------------------------------------ | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `id_geossitio`                                   | `source.id`                           | stable key                                                                                                           |
| `nome`                                           | `name`, `slug`                        | slug = kebab-case name; names that repeat in the inventory get `-<id>` appended                                      |
| geometry (`outSR=4326`)                          | `location`                            | the server reprojects SAD 69 / Córrego Alegre / SIRGAS 2000 records to WGS 84. Don't use the `lat`/`long` attributes |
| `municipio`, `uf`                                | `municipality`, `state`               |                                                                                                                      |
| `municipio` + `uf`                               | `geoparkId`                           | via the municipalities that legally make up each UNESCO geopark (see below)                                          |
| `geoparque__proposta_`                           | `geoparkProposal`                     | free text, kept only when the site isn't in a UNESCO geopark                                                         |
| `tematica_principal`                             | `categories` (0–1 items)              | 22 GEOSSIT themes → 17 categories; `"0"` → `[]`                                                                      |
| `indicativo_de_relevancia`                       | `relevance`                           | international / national / geodiversity                                                                              |
| `quantificacao_*`                                | `scores`                              | scientific, tourism, didactic, vulnerability (0–400)                                                                 |
| `risco_de_degradacao`                            | `degradationRisk`                     | low / medium / high                                                                                                  |
| `enquadramento_geologico`, `provincia_geologica` | `geology.setting`, `geology.province` |                                                                                                                      |
| `resumo`                                         | `description`, `summary`              | summary = leading sentences, at most 500 chars                                                                       |
| `link_imagem_representativa`                     | `coverImageUrl`                       | rewritten to `https://www.sgb.gov.br/…`; about 2% of these links 404, and the UI hides them                          |
| `link_geossit`                                   | `source.url`                          | same rewrite                                                                                                         |
| `autores`, `ultima_edicao`                       | `source.authors`, `source.updatedAt`  |                                                                                                                      |

**Geopark membership.** GEOSSIT's own geopark field is free text and incomplete: it marks the Romualdo Member as "Não" even though the site is inside Araripe. So `geoparkId` is assigned from municipality lists in `GEOPARK_MUNICIPALITIES`. Update those lists if a geopark's territory changes.

**Sensitive locations.** `locationIsSensitive` is set for speleological and paleontological sites and for anything with high degradation risk. Their coordinates are rounded to about 1 km in API responses.

**Misplaced points.** A few GEOSSIT records sit at 0,0, on whole-degree placeholders (−15, −48) or in the wrong state (Pico das Agulhas Negras lands in the South Atlantic). The sync checks each point against IBGE's outline of the state it names ([`placement.ts`](../src/features/geosites/placement.ts), with `brazil-places.json` built by `pnpm geo:places`): a point that isn't within 5 km of its state, or is a placeholder, moves to its municipality's centre and gets `locationIsApproximate`. Those geosites get no map-derived age, fossil records or strata (the centre says nothing about the site's rock), stay out of suggested itineraries, and the UI says where the point comes from. A misplaced point in a municipality IBGE doesn't know is skipped. The sync report lists them; they're GEOSSIT's errors to fix upstream.

## Collection: `geosites`

### Fields (`GeositeInputSchema`)

| Field                   | Type                                                | Rules                                                                                                                                            |
| ----------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `slug`                  | string                                              | kebab-case, 3–96 chars, **unique**                                                                                                               |
| `name`                  | string                                              | 2–240 chars                                                                                                                                      |
| `summary`               | string                                              | ≤ 500 chars                                                                                                                                      |
| `description`           | string?                                             | ≤ 20 000 chars                                                                                                                                   |
| `geoparkId`             | enum?                                               | `araripe`, `serido`, `caminhos-dos-canions-do-sul`, `quarta-colonia`, `cacapava`, `uberaba`                                                      |
| `geoparkProposal`       | string?                                             | aspiring-geopark name from GEOSSIT                                                                                                               |
| `municipality`          | string                                              |                                                                                                                                                  |
| `state`                 | string                                              | 2-letter UF, upper-cased                                                                                                                         |
| `categories`            | enum[]                                              | see `GEOSITE_CATEGORIES` (17 values)                                                                                                             |
| `relevance`             | enum                                                | `international`, `national`, `geodiversity`                                                                                                      |
| `scores`                | object?                                             | `{ scientific, tourism, didactic, vulnerability }`, integers 0–400                                                                               |
| `degradationRisk`       | enum?                                               | `low`, `medium`, `high`                                                                                                                          |
| `geology`               | object?                                             | `{ setting?, province? }`                                                                                                                        |
| `geologicAge`           | object?                                             | `period`, `formation?`, `minMa?`, `maxMa?`, `mapScale?`, `reference?`; derived from SGB's map at seed time, or curated with a source (see above) |
| `location`              | GeoJSON Point                                       | `{ type: "Point", coordinates: [lng, lat] }`                                                                                                     |
| `models`                | `Model3D[]`                                         | max 20; see [3D models](3d-models.md)                                                                                                            |
| `coverImageUrl`         | url?                                                |                                                                                                                                                  |
| `locationIsSensitive`   | boolean                                             | coordinates rounded to ~1 km in API responses                                                                                                    |
| `locationIsApproximate` | boolean                                             | GEOSSIT's point was misplaced; `location` is the municipality's centre                                                                           |
| `locationIssue`         | `"placeholder"` or `"outside-state"`, optional      | why the point was moved (the data-quality page)                                                                                                  |
| `protectedAreas`        | `{ id, name, category, sphere, group }[]`, optional | CNUC protected areas around the public point (sync, `pnpm geo:protected`)                                                                        |
| `publicLocation`        | GeoJSON Point                                       | stored only: `location` rounded when sensitive, written by the sync; client-steerable geo queries use it. Never returned                         |
| `source`                | object?                                             | `{ system: "geossit", id, url, authors?, updatedAt? }`                                                                                           |

### Document shape (in MongoDB)

`GeositeDoc` in `geosites.server.ts` is the parsed input plus `_id: ObjectId`, `createdAt: Date` (first import) and `updatedAt: Date` (the **last sync**, not the last upstream change; that's `source.updatedAt`). Absent optional fields are left out of the document entirely, because the client is configured with `ignoreUndefined`, rather than stored as `null`.

### API shapes (DTOs)

- `GeositeSchema` = input + `id: string`, with `createdAt`/`updatedAt` as ISO strings. The drawer loads it via `getGeositeBySlug`.
- `GeositeSummarySchema` is the light list/map record (id, slug, name, municipality, state, categories, relevance, geoparkId, location, locationIsSensitive, locationIsApproximate) plus `distanceMeters` from the centre of the queried box.

`toDto()` and the summary mapper are the only paths from document to client, and they're where sensitive coordinates get rounded.

## Indexes

Created idempotently by `ensureGeositeIndexes()`, which `pnpm db:seed` calls:

| Name                       | Keys                                                                                                                                                                                                                          | Purpose                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `location_2dsphere`        | `{ location: "2dsphere" }`                                                                                                                                                                                                    | server-side lookups on exact points                   |
| `public_location_2dsphere` | `{ publicLocation: "2dsphere" }`                                                                                                                                                                                              | `$geoNear` + `$geoWithin` viewport and nearby queries |
| `slug_unique`              | `{ slug: 1 }`, unique                                                                                                                                                                                                         | lookups by slug                                       |
| `geopark_categories`       | `{ geoparkId: 1, categories: 1 }`                                                                                                                                                                                             | filtering per geopark and category                    |
| `source_unique`            | `{ "source.system": 1, "source.id": 1 }`, unique, partial                                                                                                                                                                     | sync upsert key                                       |
| `text_search`              | text on `name` (10), `municipality` (5), `description` (1); `default_language: "none"` (no stemming: the Portuguese stemmer turned "serido" into "ser"); `ensureGeositeIndexes` rebuilds an index built with another language | header search                                         |

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
				relevance, // when filtered
				geoparkId, // when filtered
				"geologicAge.maxMa": { $gt: young }, // age filter: overlaps
				"geologicAge.minMa": { $lt: old }, // the chosen periods
			},
		},
	},
	{ $limit: limit }, // default 500, max 1000
	{ $project: SUMMARY_FIELDS },
];
```

- **Public points only.** Matching and distances use `publicLocation`. On exact coordinates, a tiny box (in or out?) or distances from a few chosen centres would locate a sensitive site to the metre; the integration tests check both.
- `$geoNear` must be the first stage. It provides the nearest-to-centre ordering and the distance; `$geoWithin` inside its `query` restricts results to the viewport.
- `bboxPolygon` ([`src/lib/geo.ts`](../src/lib/geo.ts)) densifies the box edges every 1°. MongoDB treats polygon edges as geodesics, which would otherwise bow toward the pole on wide boxes.
- Only summary fields are projected, so a Brazil-wide view (~320 sites) stays small. The map clusters them client-side.

### By slug: `findGeositeBySlug`

`findOne({ slug })`, called through `getGeositeBySlug`, which throws TanStack Router's `notFound()` when nothing matches. Because the drawer loads by slug, a shared link opens the right geosite even when it lies outside the viewport or the active filters.

### Search: `searchGeosites`

This runs a `$text` search sorted by `textScore`, which matches whole, unstemmed words and is diacritic-insensitive. When that returns fewer than `limit` results, they're topped up with a case-insensitive, accent-stripped substring match on name, municipality and abstract, so partial input like "ptero" works. The query is regex-escaped. Place search (Photon/OSM) is a separate server function, so it never slows down geosite results.

### Nearby: `findNearbyGeosites`

`$geoNear` on `publicLocation` from the geosite's public point, up to 300 km, shortlists 20 others. `rankNearby` then rounds each distance to 100 m and keeps six. Distances to or from exact sensitive coordinates would let anyone triangulate a protected site from a few pages, so they never leave the server.

### Exact location: `findGeositeLocation`

This returns the **unrounded** coordinates. It's only for server-side lookups (fossils, strata); never return its result to the client.

## URL search params (`ExplorerSearchSchema`)

| Param     | Type                                                              | Invalid input becomes                                          |
| --------- | ----------------------------------------------------------------- | -------------------------------------------------------------- |
| `bbox`    | `[west, south, east, north]`                                      | `DEFAULT_BBOX` (Araripe + Rio do Peixe basin)                  |
| `cat`     | category[] (≥ 1)                                                  | `undefined` (all)                                              |
| `rel`     | relevance?                                                        | `undefined` (all)                                              |
| `gp`      | geopark id?                                                       | `undefined` (all)                                              |
| `age`     | `[youngest, oldest]` period ids, e.g. `["cretaceous","jurassic"]` | `undefined` (all ages)                                         |
| `site`    | slug?                                                             | `undefined`                                                    |
| `tab`     | `overview` \| `model` \| `fossils`?                               | `undefined` (overview)                                         |
| `model`   | int ≥ 0?                                                          | `undefined` (first entry); out-of-range indexes fall back to 0 |
| `geo`     | `true`?                                                           | `undefined` (geology layer off)                                |
| `terrain` | `true`?                                                           | `undefined` (flat map; relief shading still on)                |
- **Map ownership.** The map writes `bbox` back on every move using history _replace_, so panning doesn't fill the back stack. It only re-fits to `bbox` when the value changes from outside (location form, back/forward).
- **What re-runs the loader.** Only `bbox`, `cat`, `rel`, `gp` and `age` are loader deps. `site`, `tab` and `model` are drawer state, fetched separately.
- **Drawer defaults.** Default values are left out of the URL. `tab` and `model` reset when another geosite is selected or the drawer closes.
- **Model indexes.** `model` indexes the geosite's models, followed by the mapped strata column as the last entry.

Every field uses `.catch()`, so a hand-edited or stale URL falls back to the defaults instead of erroring. Arrays are JSON-encoded by TanStack Router (e.g. `bbox=[-40.6,-7.9,-37.9,-6.3]`, URL-escaped).

## Geology lookups

These are per-geosite queries to public APIs, made by server functions in [`src/features/geology/`](../src/features/geology). The client sends a **slug**, never coordinates; the server resolves the exact location itself, so sensitive sites stay private. Each source fails independently and reports `unavailable` instead of failing the request. Results are cached in the `api_cache` collection.

| Lookup              | Source                                                                           | Radius                       | Cache               | UI                              |
| ------------------- | -------------------------------------------------------------------------------- | ---------------------------- | ------------------- | ------------------------------- |
| `getGeositeFossils` | SGB OGC API `geologia/ocorrencias-fossiliferas` (bbox, then haversine filter)    | 5 km                         | 7 days              | "Fósseis" tab                   |
| `getGeositeFossils` | GBIF `occurrence/search?geoDistance=…&basisOfRecord=FOSSIL_SPECIMEN` (first 100) | 5 km                         | 7 days              | "Fósseis" tab                   |
| `getGeositeStrata`  | SGB OGC API `geologia/litoestratigrafia/{25000…1000000}` with `skipGeometry`     | ~3 km box                    | 30 days             | 3D tab, "Coluna estratigráfica" |
| `getGeologyAt`      | same API, 1:1,000,000 only (matches the map layer)                               | ~50 m box at a clicked point | 30 days, per ~100 m | geology layer identify card     |

**Fossil records.** Taxa recorded in ALL CAPS are sentence-cased. Comma-separated authorship years ("Dastilbe elongatus Santos, 1947") are kept with their name rather than split into fake taxa. For sensitive geosites, distances are rounded to whole kilometres. GBIF licences vary per record (CC0 / CC-BY / CC-BY-NC), and each card shows its own.

**Strata.** Detailed scales cover only parts of Brazil. The lookup uses the most detailed scale with any unit and falls back to 1:1,000,000, which covers the whole country. Units are deduplicated by code and ordered youngest (top) → oldest (base), coloured with ICS colours by mid-age ([`time-scale.ts`](../src/features/geology/time-scale.ts)). The map has no thickness data, so the column's thicknesses are illustrative, and the UI says so.

Cache keys are versioned (`fossils:sgb:v3:<slug>`). Bump the version when the mapping changes, so stale entries are ignored and expire on their own.

## Collection: `fossil_genera`

The fossil pages (`/fossils`, `/fossils/$genus`) read this collection. It's rebuilt from `fossil_sites` (below), which holds each geosite's records from the same cached lookups as its "Fósseis" tab:
1. For every geosite, the SGB and GBIF fossil records within 5 km.
2. Each recorded name is cut to genus + epithet (`matchQuery`: "dastilbe elongatus santos, 1947" → "Dastilbe elongatus") and matched with GBIF's [`species/match`](https://techdocs.gbif.org/en/openapi/v1/species) (cached 30 days as `gbif-match:v1:<name>`).
3. Only **exact** matches at genus rank or below are kept, plus a HIGHERRANK match to the recorded genus when the backbone lacks the species (`acceptMatch`). Fuzzy matches are dropped: recorded names include Portuguese descriptions ("Restos vegetais") that fuzzy matching turns into unrelated genera. Higher taxa ("Araneae", "Squamata") are skipped.
4. Records are folded per GBIF genus key (`aggregateGenera`): accepted species, the geosites with record counts, units and ages as recorded (up to 12 each), records per source.

| Field             | Type                                                         | Notes                                                                            |
| ----------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `_id`             | string                                                       | URL slug, the genus in lower case (`dastilbe`); `<slug>-<gbifKey>` for a homonym |
| `name`, `gbifKey` | string, int                                                  | GBIF backbone genus                                                              |
| `classification`  | `{ kingdom?, phylum?, class?, order?, family? }`             | from GBIF; the index groups by `class`                                           |
| `species`         | string[]                                                     | accepted species names recorded                                                  |
| `geosites`        | `{ slug, name, municipality, state, geoparkId?, records }[]` | most records first                                                               |
| `units`, `ages`   | string[]                                                     | as recorded (Portuguese from SGB, English from GBIF)                             |
| `records`         | `{ sgb, gbif }`                                              |                                                                                  |
| `updatedAt`       | Date                                                         |                                                                                  |

Index: `geosites.slug` (genera near a geosite or geopark). **No coordinates are stored**: a genus page names geosites, never where a specimen was found, so sensitive sites stay as private as on their own page.
## Collection: `geosite_changes`

What each GEOSSIT sync changed, for "Novidades" (`/news`) and its RSS feed. `syncGeosites` reads the stored geosites before writing and compares them with the import (`diffGeosites` in [`src/features/news/changes.ts`](../src/features/news/changes.ts)), matched by GEOSSIT id:

| Field     | Type                       | Notes                                                                                                                                                          |
| --------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `at`      | Date                       | when the sync ran                                                                                                                                              |
| `added`   | `{ slug, name }[]`         | new in GEOSSIT                                                                                                                                                 |
| `changed` | `{ slug, name, fields }[]` | `fields` from `CHANGE_FIELDS`: name, description, location, municipality, categories, relevance, scores, degradationRisk, geology, geologicAge, geopark, photo |
| `removed` | `{ name }[]`               | gone from GEOSSIT (no page any more)                                                                                                                           |

Only syncs with changes are stored, and the latest 52 are kept. A first import into an empty database isn't recorded. Fields are compared as canonical JSON (sorted keys, no empty values; categories as a set), so a reordered record isn't a change. Internal fields (models, `updatedAt`) are ignored. A location change is listed without coordinates. Index: `at`.

### Collection: `fossil_sites`

One document per geosite: `_id` (the geosite slug), `records` (`{ source, match, unit?, age? }[]`, the matched GBIF genus per occurrence), `unmatchedNames` (recorded names with no GBIF genus, for review) and `refreshedAt`. Index: `refreshedAt`.
- `pnpm db:fossils` (`buildFossilIndex` in [`fossils.server.ts`](../src/features/fossils/fossils.server.ts)) refreshes every geosite, then rebuilds `fossil_genera`. It writes no genus pages when more than 10% of the geosites fail.
- The daily cron (`refreshFossilIndexSlice`) refreshes the geosites refreshed longest ago (never-refreshed first) for ~35 s, then rebuilds. A full refresh is about 640 upstream calls on a cold cache, past the function's 60 s, hence the slices.
- A geosite whose lookups or name matches fail keeps its previous records. `fossil_genera` is rebuilt only when at least 90% of the geosites have records (`MIN_FOSSIL_COVERAGE`), and records of geosites GEOSSIT dropped are deleted first.

## Other open data sources (not used yet)

| Source                             | What it would add                                |
| ---------------------------------- | ------------------------------------------------ |
| Overpass (`natural=cave_entrance`) | ~590 cave entrances in Brazil from OpenStreetMap |
| SGB ArcGIS `geologia/*` MapServers | geology map tiles for a map overlay              |
