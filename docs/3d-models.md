# 3D models

Each geosite can carry up to 20 entries in `models`. These are fossil, strata, cave, outcrop or mineral scans shown in the drawer's **Modelo 3D** tab by [`ModelViewer.tsx`](../src/features/geosites/components/ModelViewer.tsx).

## Metadata (`Model3DSchema`)

| Field | Type | Notes |
| --- | --- | --- |
| `kind` | enum | `fossil`, `strata`, `cave`, `outcrop`, `mineral` |
| `title` | string | shown in the model picker when there is more than one model |
| `format` | `glb` \| `gltf` | prefer `glb` (single file) |
| `url` | **https** URL | the model file; plain `http` is rejected |
| `lodUrl` | https URL? | lighter Draco/meshopt variant (reserved, not used by the viewer yet) |
| `previewImageUrl` | URL? | thumbnail (reserved) |
| `realWorldSizeM` | number? | longest axis in metres; shown in the credits line |
| `upAxis` | `y` \| `z` | default `y`. Photogrammetry exports are often Z-up; `z` rotates the model −90° about X |
| `license` | string | SPDX or Creative Commons id, e.g. `CC-BY-4.0` |
| `attribution` | string | author or institution credit (required) |
| `polycount` | int? | informational |

Example:

```json
{
  "kind": "fossil",
  "title": "Pterossauro – concreção da Fm. Romualdo",
  "format": "glb",
  "url": "https://cdn.example.org/models/pterosaur.glb",
  "realWorldSizeM": 0.42,
  "upAxis": "z",
  "license": "CC-BY-4.0",
  "attribution": "Museu de Paleontologia Plácido Cidade Nuvens / URCA"
}
```

## Viewer behaviour

- three.js, R3F and drei sit in a lazy chunk (~270 kB gzip) that loads only when the 3D tab opens. The viewer is wrapped in `<ClientOnly>`, so it never renders on the server.
- `<Bounds fit clip observe>` frames any model automatically, so scale and origin don't need to be normalised beforehand.
- `OrbitControls` (with damping) handles rotate, zoom and pan.
- When a geosite has no models, the viewer renders an **illustrative stratigraphic column** loosely based on the Araripe basin, with a colour legend.
- A model that fails to load (404, CORS, bad file) is caught by an error boundary, which shows *"Falha ao carregar o modelo 3D."* instead of crashing the drawer.
- Overlays (legend, error message) are plain DOM outside the `<Canvas>`. Don't use drei `<Html>`: it mounts extra React roots, and React 19 logs errors when they unmount.

## Preparing assets

1. **Export** to glTF binary (`.glb`) from Blender, Meshroom, RealityCapture, Polycam, etc.
2. **Compress** with [`gltf-transform`](https://gltf-transform.dev/):
   ```bash
   npx @gltf-transform/cli optimize in.glb out.glb --compress draco --texture-compress webp
   ```
   Target **< 10 MB** and **< 500k triangles** for the main file. Draco-compressed files need drei's Draco decoder, which `useGLTF` sets up by default but which is fetched from a CDN. Self-host it if you need to work offline.
3. **Host** on HTTPS with CORS allowing the app's origin (`Access-Control-Allow-Origin`). Object storage plus a CDN works well (S3/R2/GCS).
4. **Orientation:** if the model shows up lying on its side, set `upAxis: "z"`.
5. **Credit and licence** are mandatory. Many museum scans are CC-BY-NC; check the terms before publishing.

## Sensitive sites

Model files can reveal location details, such as embedded GPS EXIF in textures or recognisable surroundings. For geosites with `locationIsSensitive: true`, strip metadata from textures and prefer specimen-only scans over in-situ captures.
