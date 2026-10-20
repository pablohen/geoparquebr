# 3D models

Each geosite can carry up to 20 `models`, shown in the drawer's **Modelo 3D** tab. They come from a curated catalog: [`model-catalog.server.ts`](../src/features/geosites/model-catalog.server.ts).

## Two ways to render

`Model3DSchema` is a discriminated union on `provider`:

| `provider` | Rendered by | Used for |
| --- | --- | --- |
| `sketchfab` | [`SketchfabEmbed`](../src/features/geosites/components/SketchfabEmbed.tsx): Sketchfab's own iframe viewer (`dnt=1`) | view-only models we may display but not redistribute, and CC BY models not downloaded yet |
| `gltf` | [`ModelViewer`](../src/features/geosites/components/ModelViewer.tsx): React Three Fiber | self-hosted GLBs in `public/models/`, or any HTTPS URL with CORS |

The three.js chunk (~270 kB gzip) loads only when a `gltf` model or a strata column is on screen; Sketchfab embeds don't need it.

## Strata column

Every geosite's model picker ends with **"Coluna estratigráfica (mapa do SGB)"**. For geosites without scans, it's the only entry. The column is built from the lithostratigraphic units the SGB has mapped within ~3 km (see [data model → geology lookups](data-model.md#geology-lookups)). Bands are ordered youngest (top) → oldest (base) and coloured with ICS colours. All bands get equal thickness, which is illustrative because the map has no thickness data, and the caption says so. If nothing is mapped or the service is down, the viewer falls back to an illustrative Araripe column and says that instead.

### Shared fields

| Field | Notes |
| --- | --- |
| `kind` | `fossil`, `strata`, `cave`, `outcrop`, `mineral` |
| `title` | shown above the credits and in the model picker |
| `provenance` | `locality` (from this geosite), `region` (same basin, exact site unknown), `illustrative` (example only). Shown to users verbatim |
| `license` | `CC-BY-4.0`, or `Sketchfab Standard` for view-only |
| `attribution` | required credit |
| `sourceUrl` | page where the model is published |
| `realWorldSizeM`, `polycount` | optional |

`gltf` models add `format` (`glb` \| `gltf`), `url` (`https://…` or `/models/<file>.glb`) and `upAxis` (`y` default; `z` rotates −90° about X for Z-up photogrammetry). `sketchfab` models add `uid` (32 hex chars).

## Catalog

Each entry names a Sketchfab model, its license, its provenance, and what it attaches to: specific GEOSSIT ids, or every geosite in some categories. Current entries, all from **GeoHereditas · Museu de Geociências IGc-USP**:

| Model | License | Attached to | Provenance |
| --- | --- | --- | --- |
| Peixe fóssil da Bacia do Araripe | CC BY 4.0 | GEOSSIT 1915, Membro Romualdo (fish-bearing nodules) | region |
| Amonita | view-only | GEOSSIT 1920, Pedreira Poty (K–Pg boundary; its abstract cites the ammonite extinction) | illustrative |
| Estalagmite de aragonita com coralóides | CC BY 4.0 | every `speleological` geosite | illustrative |

**Only attach a model where the provenance holds up, and label it honestly.** GeoHereditas also has Purussaurus, mastodon and mesosaur fossils, but GEOSSIT has no matching sites, so they're left out.

`modelsFor()` resolves each entry at seed time. A CC BY entry whose GLB exists in `public/models/` becomes `provider: "gltf"`; anything else becomes `provider: "sketchfab"`.

## Self-hosting CC BY models

```bash
# .env
SKETCHFAB_TOKEN="…"   # https://sketchfab.com/settings/password → API token

pnpm models:fetch     # downloads + optimizes CC BY models → public/models/<uid>.glb
pnpm db:seed          # re-attach models; they now point at /models/<uid>.glb
```

[`scripts/fetch-models.ts`](../scripts/fetch-models.ts):

1. Re-checks each model's license (`slug === "by"`) and `isDownloadable` before downloading, since authors can change them.
2. Requests a signed GLB URL from `GET /v3/models/{uid}/download`, which needs the token.
3. Optimizes with [`scripts/lib/optimize-glb.ts`](../scripts/lib/optimize-glb.ts): dedup, weld, simplify to ≤ 300k triangles (meshoptimizer), WebP textures ≤ 2048 px (sharp), then meshopt compression. On a Khronos sample this took 3.8 MB → 0.53 MB.
4. Writes `public/models/<uid>.glb`, skipping files that already exist unless you pass `--force`.

drei's `useGLTF` decodes meshopt with a bundled decoder, so no CDN is involved, unlike Draco.

The GeoHereditas scans are 1.7M–5.5M triangles before optimization. Expect the downloads to be large.

## Adding a model

1. Find it on Sketchfab and note the uid from its URL, the license, and where the specimen was actually collected.
2. Add a `MODEL_CATALOG` entry with an honest `provenance` and a comment explaining the attachment.
3. For CC BY models, run `pnpm models:fetch`.
4. Run `pnpm db:seed`.

Other sources: models from MorphoSource or museums can use `provider: "gltf"` with an HTTPS URL, if the host allows CORS and the license permits it.

## Sensitive sites

Model files can reveal location details, such as GPS EXIF in textures or recognisable surroundings. For geosites with `locationIsSensitive`, prefer specimen-only scans over in-situ captures.
