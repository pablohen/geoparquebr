# Data model

All shapes are defined once in [`src/features/geosites/schemas.ts`](../src/features/geosites/schemas.ts). This page explains them; the code is authoritative.

## Where the data comes from

The `geosites` collection is a mirror of **GEOSSIT**, the Geological Survey of Brazil's (SGB/CPRM) inventory of geosites and geodiversity sites. GEOSSIT is published as an ArcGIS FeatureServer layer:

```
https://geoportal.sgb.gov.br/server/rest/services/gestaoterritorial/geossit/FeatureServer/0
```

`pnpm db:seed` fetches every feature (about 320), validates each one with Zod, maps it to `GeositeInput`, attaches 3D models from the [model catalog](3d-models.md), and upserts the result. The mapping lives in [`geossit.server.ts`](../src/features/geosites/geossit.server.ts).

- **Read-only.** The layer advertises edit capabilities; never call anything except `query`.
- **Idempotent.** Records are keyed by `source.{system,id}`. A re-run updates changed records and deletes the ones GEOSSIT dropped.
- **Validated per record.** An invalid feature is skipped with a reason printed, and the rest still import.
- **Credit.** Show "GEOSSIT — Serviço Geológico do Brasil (SGB/CPRM)" and link `source.url` wherever GEOSSIT data appears. The drawer does this.

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
| `geologicAge` | object? | `period`, `formation?`, `minMa?`, `maxMa?`; not provided by GEOSSIT |
| `location` | GeoJSON Point | `{ type: "Point", coordinates: [lng, lat] }` |
| `models` | `Model3D[]` | max 20; see [3D models](3d-models.md) |
| `coverImageUrl` | url? | |
| `locationIsSensitive` | boolean | coordinates rounded to ~1 km in API responses |
| `source` | object? | `{ system: "geossit", id, url, authors?, updatedAt? }` |

### Document shape (in MongoDB)

`GeositeDoc` in `geosites.server.ts` is the parsed input plus `_id: ObjectId`, `createdAt: Date` (first import) and `updatedAt: Date` (the **last sync**, not the last upstream change; that's `source.updatedAt`). Absent optional fields are left out of the document entirely, because the client is configured with `ignoreUndefined`, rather than stored as `null`.

### API shape (DTO)

`GeositeSchema` = input + `id: string`, with `createdAt`/`updatedAt` as ISO strings. Nearby queries return `GeositeWithDistanceSchema`, which adds `distanceMeters: number`. `toDto()` is the only path from document to DTO, and it's where sensitive coordinates get rounded.

## Indexes

Created idempotently by `ensureGeositeIndexes()`, which `pnpm db:seed` calls:

| Name | Keys | Purpose |
| --- | --- | --- |
| `location_2dsphere` | `{ location: "2dsphere" }` | `$geoNear`, `$geoWithin`, `$near` |
| `slug_unique` | `{ slug: 1 }`, unique | lookups by slug |
| `geopark_categories` | `{ geoparkId: 1, categories: 1 }` | filtering per geopark and category |
| `source_unique` | `{ "source.system": 1, "source.id": 1 }`, unique, partial | sync upsert key |

## Queries

### Nearby geosites: `findGeositesNear`

```ts
[
  {
    $geoNear: {
      near: { type: "Point", coordinates: [lng, lat] },
      key: "location",
      spherical: true,
      distanceField: "distanceMeters",
      maxDistance: radiusKm * 1000,
      query: categories?.length ? { categories: { $in: categories } } : {},
    },
  },
  { $limit: limit },
]
```

- Input comes from `NearbyGeositesQuerySchema`: `radiusKm` defaults to 250 (max 1000) and `limit` defaults to 50 (max 200).
- Results are sorted by distance, nearest first.
- `$geoNear` is used instead of `find({ $near })` because it can return the distance. It must be the first stage of the pipeline.

### By slug: `findGeositeBySlug`

`findOne({ slug })`. The `getGeositeBySlug` server function throws TanStack Router's `notFound()` when nothing matches.

### Adding a bounding-box query (map viewport)

To load everything visible on the map, use `$geoWithin` with a `$geometry` polygon built from `map.getBounds()`. It uses the same `2dsphere` index:

```ts
col.find({
  location: {
    $geoWithin: {
      $geometry: {
        type: "Polygon",
        coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]],
      },
    },
  },
});
```

## URL search params (`ExplorerSearchSchema`)

| Param | Type | Invalid input becomes |
| --- | --- | --- |
| `lng` | number | `-39.6` (Chapada do Araripe) |
| `lat` | number | `-7.25` |
| `radiusKm` | number, 0 < r ≤ 1000 | `250` |
| `site` | slug? | `undefined` |
| `tab` | `overview` \| `model`? | `undefined` (overview) |
| `model` | int ≥ 0? | `undefined` (first model); out-of-range indexes fall back to 0 |

`tab` and `model` hold the drawer's UI state, so a shared link opens the same tab and model. Default values are left out of the URL, and both are cleared when another geosite is selected or the drawer closes.

Every field uses `z.coerce` + `.catch()`, so a hand-edited or stale URL never errors: it falls back to the defaults.

The drawer only opens a `site` that is among the loaded nearby results. A link whose `lng`/`lat`/`radiusKm` don't include the site shows the map without the drawer.

## Other open data sources (not imported yet)

| Source | What it adds |
| --- | --- |
| SGB OGC API `geologia/ocorrencias-fossiliferas` (`https://geoservicos.sgb.gov.br/ogcapi`) | fossil occurrences: taxon, holotype status, collection number, formation, bibliography |
| SGB OGC API `geologia/litoestratigrafia/{1000000…25000}` | lithostratigraphic unit polygons with ages; could replace the illustrative strata column |
| GBIF Occurrence API (`basisOfRecord=FOSSIL_SPECIMEN`) | museum specimens with CC-BY photos |
| Overpass (`natural=cave_entrance`) | cave entrances from OpenStreetMap |
