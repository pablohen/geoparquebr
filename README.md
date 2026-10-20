# GeoparqueBR

Explore Brazilian UNESCO Global Geoparks: geosites, strata, fossil beds and karst caves.

**Stack:** TanStack Start · MongoDB Atlas (2dsphere) · Zod 4 · Mantine 7 · React Hook Form · MapLibre GL · React Three Fiber · Biome · pnpm

## Getting started

```bash
cp .env.example .env          # set MONGODB_URI (Atlas, or mongodb://localhost:27017)
docker compose up -d          # optional: local MongoDB instead of Atlas
pnpm install
pnpm db:seed                  # creates indexes (2dsphere, slug) + sample geosites
pnpm dev                      # http://localhost:3000
```

## Layout

```
src/
├── routes/                     # file-based routes (TanStack Router)
│   ├── __root.tsx              # <html>, Mantine provider, global CSS
│   └── index.tsx               # explorer: validated search params → loader → UI
├── features/
│   └── geosites/               # one folder per domain feature
│       ├── schemas.ts          # Zod: single source of truth (isomorphic)
│       ├── geosites.server.ts  # Mongo queries — server-only
│       ├── geosites.functions.ts # createServerFn RPCs — safe to import anywhere
│       └── components/         # Explorer, List, Drawer, Map (MapLibre), ModelViewer (R3F)
├── lib/db.server.ts            # pooled MongoClient singleton
├── router.tsx
└── theme.ts
scripts/seed.ts                 # indexes + sample data
```

Conventions:

- `*.server.ts` never gets imported by client code directly; `*.functions.ts` wraps it in `createServerFn`, and the build swaps handlers for RPC stubs on the client.
- Schemas in `schemas.ts` drive route `validateSearch`, server-function `.validator()`, RHF `zodResolver`, and seed validation.
- MapLibre and three.js load lazily on the client only (`ClientOnly` + `React.lazy`).
- GeoJSON coordinates are always `[lng, lat]`.
- Geosites flagged `locationIsSensitive` have their coordinates rounded (~1 km) before leaving the server.
