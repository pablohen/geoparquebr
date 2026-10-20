# Data model

All shapes are defined once in [`src/features/geosites/schemas.ts`](../src/features/geosites/schemas.ts). This page explains them; the code is authoritative.

## Collection: `geosites`

### Document shape (in MongoDB)

`GeositeDoc` in `geosites.server.ts` is `GeositeInput` (parsed) plus:

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | `ObjectId` | never leaves the server |
| `createdAt` | `Date` | set once on insert |
| `updatedAt` | `Date` | set on every write |

### Fields (`GeositeInputSchema`)

| Field | Type | Rules |
| --- | --- | --- |
| `slug` | string | kebab-case, 3–96 chars, **unique** |
| `name` | string | 2–160 chars |
| `summary` | string | ≤ 500 chars |
| `description` | string? | ≤ 20 000 chars |
| `geoparkId` | enum | `araripe`, `serido`, `caminhos-dos-canions-do-sul`, `quarta-colonia`, `cacapava`, `uberaba` |
| `municipality` | string | |
| `state` | string | 2-letter UF, upper-cased |
| `categories` | enum[] | ≥ 1 of `paleontological`, `geomorphological`, `speleological`, `stratigraphic`, `mineralogical`, `petrological`, `hydrogeological`, `tectonic` |
| `scientificValue` | enum | `international`, `national`, `regional`, `local` |
| `geologicAge` | object? | `period`, `formation?`, `minMa?`, `maxMa?` (requires `minMa ≤ maxMa`) |
| `location` | GeoJSON Point | `{ type: "Point", coordinates: [lng, lat] }` |
| `models` | `Model3D[]` | default `[]`, max 20; see [3D models](3d-models.md) |
| `coverImageUrl` | url? | |
| `locationIsSensitive` | boolean | default `false`; coordinates are rounded to ~1 km in API responses |

### API shape (DTO)

`GeositeSchema` = input + `id: string`, `createdAt`/`updatedAt` as ISO strings. Nearby queries return `GeositeWithDistanceSchema`, which adds `distanceMeters: number`.

`toDto()` is the only path from document to DTO. It's also where sensitive coordinates get obfuscated.

## Indexes

Created idempotently by `ensureGeositeIndexes()` (called from `pnpm db:seed`):

| Name | Keys | Purpose |
| --- | --- | --- |
| `location_2dsphere` | `{ location: "2dsphere" }` | `$geoNear`, `$geoWithin`, `$near` |
| `slug_unique` | `{ slug: 1 }`, unique | lookups by slug, upsert key |
| `geopark_categories` | `{ geoparkId: 1, categories: 1 }` | filtering per geopark and category |

On Atlas you can also create these in the UI. Keep the names identical so `createIndexes` stays a no-op.

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

- Input comes from `NearbyGeositesQuerySchema`: `radiusKm` defaults to 150 (max 1000) and `limit` defaults to 50 (max 200).
- Results are sorted by distance, nearest first.
- `$geoNear` is used instead of `find({ $near })` because it can return the computed distance. It must be the first stage of the pipeline.

### By slug: `findGeositeBySlug`

`findOne({ slug })`. The `getGeositeBySlug` server function throws TanStack Router's `notFound()` when nothing matches.

### Adding a bounding-box query (map viewport)

To load "everything visible on the map" instead of "near a point", use `$geoWithin` with a `$geometry` polygon built from `map.getBounds()`. It uses the same `2dsphere` index:

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
| `radiusKm` | number, 0 < r ≤ 1000 | `150` |
| `site` | slug? | `undefined` |
| `tab` | `overview` \| `model`? | `undefined` (overview) |
| `model` | int ≥ 0? | `undefined` (first model); out-of-range indexes fall back to 0 |

`tab` and `model` hold the drawer's UI state, so a shared link opens the same tab and model. Default values are left out of the URL, and both are cleared when another geosite is selected or the drawer closes.

Every field uses `z.coerce` + `.catch()`, so a hand-edited or stale URL never errors: it falls back to the defaults.
