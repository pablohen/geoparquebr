# Deployment

GeoparqueBR is a TanStack Start app built by Vite. The [Nitro](https://nitro.build) plugin (`nitro/vite`, in [`vite.config.ts`](../vite.config.ts)) turns the server build into a deployable app. The preset is chosen from the environment:

| Where `pnpm build` runs | Output | Run with |
| --- | --- | --- |
| Vercel (`VERCEL=1`), or `NITRO_PRESET=vercel` | `.vercel/output/` ([Build Output API v3](https://vercel.com/docs/build-output-api/v3)) | Vercel |
| anywhere else | `.output/` (standalone Node.js server) | `pnpm start` |

Everything is hosted in **São Paulo**: the Vercel function region is `gru1`, and the database should be an Atlas cluster in AWS `sa-east-1`. Users, the SGB/GEOSSIT APIs and the database are all in Brazil, so keep them close together.

## Vercel

### 1. Database (MongoDB Atlas)

1. Create a cluster in **AWS / São Paulo (`sa-east-1`)**. The free M0 tier is enough: the data is about 320 geosites plus the API cache.
2. **Database Access:** create a user with `readWrite` on `geoparquebr`.
3. **Network Access:** allow `0.0.0.0/0`. Vercel functions have no fixed outbound IPs. (Paid plans can use Vercel's Secure Compute or Atlas private endpoints instead.)
4. Load the data from your machine. Run this once, and again whenever you want fresh GEOSSIT data:

   ```bash
   MONGODB_URI="mongodb+srv://…" MONGODB_DB=geoparquebr pnpm db:seed
   ```

   This creates the indexes (2dsphere, text, unique keys) and imports GEOSSIT. The `api_cache` collection and its TTL index are created automatically on first use.

### 2. Project

1. On Vercel, choose **Add New → Project** and import `pablohen/geoparquebr`.
2. Keep the defaults. Vercel installs with the pnpm version pinned in `packageManager`, runs `pnpm build`, and picks up `.vercel/output`. Node comes from `engines` (`>=24`, so Node 24).
3. **Environment variables** (Production and Preview):

   | Name | Value |
   | --- | --- |
   | `MONGODB_URI` | the Atlas `mongodb+srv://` connection string |
   | `MONGODB_DB` | `geoparquebr` |

   `SKETCHFAB_TOKEN` is only needed locally, for `pnpm models:fetch`.
4. **Settings → Functions → Function Region:** also set **São Paulo, Brazil (gru1)**, so the project setting matches what the build already writes.
5. Deploy. Every push to `main` deploys to production, and other branches get preview URLs.

### What the build sets

The Vercel preset writes these values in `vite.config.ts` (`nitro({ vercel: { functions } })`):

| Setting | Value | Why |
| --- | --- | --- |
| `regions` | `["gru1"]` | São Paulo |
| `maxDuration` | `30` s | Place search can take up to 12 s. MongoDB fails after 10 s (`serverSelectionTimeoutMS`) rather than hanging |
| `runtime` | `nodejs24.x` | from `engines` |
| static `/assets/*` | `cache-control: public, max-age=31536000, immutable` | content-hashed files |

The whole app (SSR plus server functions) runs as one function, `__server` (~3.4 MB). Static files are served from Vercel's CDN.

To check the output locally:

```bash
NITRO_PRESET=vercel pnpm build
cat .vercel/output/functions/__server.func/.vc-config.json   # regions: ["gru1"]
```

### After deploying

- Open the site, pan the map, open a geosite and check the "Fósseis" and "Modelo 3D" tabs. Then turn on the geology layer and click the map.
- Server logs are under **Vercel → Project → Logs**. Upstream outages (SGB, GBIF, Photon) are logged as warnings, and the UI shows "indisponível" rather than failing.

## Other hosts (Node.js)

```bash
pnpm build                      # → .output/
PORT=3000 MONGODB_URI=… MONGODB_DB=geoparquebr pnpm start
```

`.output/` is self-contained: copy it to a server, or use it as a Docker image's contents. Run it on Node 24 or later. Other Nitro presets (Netlify, Cloudflare, Bun…) are set with `NITRO_PRESET`; see the [Nitro deploy docs](https://nitro.build/deploy).

## Self-hosted 3D models

`public/models/*.glb` (from `pnpm models:fetch`) are served as static files, but only if they're deployed. Either commit them (consider Git LFS, since they can be several MB each) or host them on object storage and switch the catalog entries to HTTPS URLs. Until then, models fall back to Sketchfab embeds.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Pages return 500/504 after ~10 s | Atlas is unreachable. Check `MONGODB_URI`, the database user, and that Network Access allows `0.0.0.0/0` |
| Empty map/list in production | The database wasn't seeded. Run `pnpm db:seed` against the Atlas URI |
| `ERR_PNPM_…` lockfile errors on install | Vercel isn't using the pinned pnpm. Check `packageManager` in `package.json` and that corepack isn't disabled in project settings |
| Function deployed outside São Paulo | Check `regions` in `.vc-config.json` and the project's Function Region setting |
