# GeoparqueBR

Explore Brazilian UNESCO Global Geoparks and the wider geoheritage inventory: geosites, strata, fossil beds and karst caves, on a map and in 3D.

Geosite data: [GEOSSIT](https://www.sgb.gov.br/geossit/), Serviço Geológico do Brasil (SGB/CPRM). 3D models: [GeoHereditas](https://sketchfab.com/geohereditas), Museu de Geociências IGc-USP.

**Stack:** TanStack Start · MongoDB Atlas (2dsphere) · Zod 4 · Mantine 7 · React Hook Form · MapLibre GL · React Three Fiber · Biome · pnpm

## Quick start

```bash
pnpm install
cp .env.example .env          # set MONGODB_URI (Atlas, or mongodb://localhost:27017)
docker compose up -d          # optional: local MongoDB instead of Atlas
pnpm db:seed                  # indexes + geosites from GEOSSIT (SGB/CPRM) + 3D models
pnpm models:fetch             # optional: self-host CC BY 3D models (needs SKETCHFAB_TOKEN)
pnpm dev                      # http://localhost:3000
```

## Documentation

- [Architecture](docs/architecture.md): layers, server/client boundary, request lifecycle, adding a feature
- [Data model](docs/data-model.md): geosite schema, indexes, geospatial queries, URL params
- [Development](docs/development.md): setup, env vars, scripts, troubleshooting
- [3D models](docs/3d-models.md): model metadata, viewer behaviour, preparing assets
- [AGENTS.md](AGENTS.md): conventions and rules for contributors and AI agents
