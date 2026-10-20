# GeoparqueBR

Explore Brazilian UNESCO Global Geoparks: geosites, strata, fossil beds and karst caves, on a map and in 3D.

**Stack:** TanStack Start · MongoDB Atlas (2dsphere) · Zod 4 · Mantine 7 · React Hook Form · MapLibre GL · React Three Fiber · Biome · pnpm

## Quick start

```bash
pnpm install
cp .env.example .env          # set MONGODB_URI (Atlas, or mongodb://localhost:27017)
docker compose up -d          # optional: local MongoDB instead of Atlas
pnpm db:seed                  # indexes (2dsphere, slug) + sample geosites
pnpm dev                      # http://localhost:3000
```

## Documentation

- [Architecture](docs/architecture.md): layers, server/client boundary, request lifecycle, adding a feature
- [Data model](docs/data-model.md): geosite schema, indexes, geospatial queries, URL params
- [Development](docs/development.md): setup, env vars, scripts, troubleshooting
- [3D models](docs/3d-models.md): model metadata, viewer behaviour, preparing assets
- [AGENTS.md](AGENTS.md): conventions and rules for contributors and AI agents
