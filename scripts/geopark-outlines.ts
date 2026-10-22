/**
 * Builds public/data/geopark-outlines.geojson: each UNESCO geopark's
 * municipalities (GEOPARK_MUNICIPALITIES), from IBGE's official municipal
 * boundaries (per-state shapefiles on geoftp.ibge.gov.br), merged into one
 * (multi)polygon and simplified to ~30 m. Re-run when a geopark gains a
 * municipality or IBGE publishes a new edition.
 * Usage: pnpm geo:outlines
 */
import { writeFileSync } from "node:fs";
import { unzipSync } from "fflate";
import polygonClipping, { type MultiPolygon } from "polygon-clipping";
import { read } from "shapefile";
import { GEOPARK_MUNICIPALITIES } from "~/features/geoparks/geoparks";
import { isMunicipality, simplifyRing } from "~/features/geoparks/outlines";

const EDITION = 2025;
const BASE = `https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_${EDITION}/UFs`;
const OUT = "public/data/geopark-outlines.geojson";
/** ~30 m: invisible at the zooms the outline is useful at. */
const TOLERANCE = 0.0003;

type Feature = {
	properties: { NM_MUN?: string; CD_MUN?: string } | null;
	geometry:
		| { type: "Polygon"; coordinates: number[][][] }
		| { type: "MultiPolygon"; coordinates: number[][][][] }
		| null;
};

const states = new Map<string, Feature[]>();
async function municipalitiesOf(uf: string): Promise<Feature[]> {
	const cached = states.get(uf);
	if (cached) return cached;
	const url = `${BASE}/${uf}/${uf}_Municipios_${EDITION}.zip`;
	const res = await fetch(url);
	if (!res.ok) throw new Error(`${res.status} ${url}`);
	const files = unzipSync(new Uint8Array(await res.arrayBuffer()));
	const find = (ext: string) =>
		Object.entries(files).find(([name]) =>
			name.toLowerCase().endsWith(ext),
		)?.[1];
	const shp = find(".shp");
	const dbf = find(".dbf");
	if (!shp || !dbf) throw new Error(`no .shp/.dbf in ${url}`);
	// The reader takes the files' exact bytes as ArrayBuffers.
	const bytes = (f: Uint8Array) =>
		f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength) as ArrayBuffer;
	const fc = (await read(bytes(shp), bytes(dbf), { encoding: "utf-8" })) as {
		features: Feature[];
	};
	states.set(uf, fc.features);
	console.log(`${uf}: ${fc.features.length} municipalities`);
	return fc.features;
}

const simplify = (g: MultiPolygon): MultiPolygon =>
	g.map((poly) =>
		poly.map((ring) =>
			simplifyRing(ring as [number, number][], TOLERANCE).map(([x, y]) => [
				Math.round(x * 1e5) / 1e5,
				Math.round(y * 1e5) / 1e5,
			]),
		),
	) as MultiPolygon;

const features = [];
for (const [id, keys] of Object.entries(GEOPARK_MUNICIPALITIES)) {
	const shapes: MultiPolygon[] = [];
	for (const key of keys) {
		const found = (await municipalitiesOf(key.slice(0, 2))).find((f) =>
			isMunicipality(key, f.properties?.NM_MUN ?? ""),
		);
		const g = found?.geometry;
		if (!g) throw new Error(`no IBGE municipality for ${key}`);
		shapes.push(
			(g.type === "Polygon" ? [g.coordinates] : g.coordinates) as MultiPolygon,
		);
		console.log(`  ${id}: ${key} (${found.properties?.CD_MUN})`);
	}
	const [first, ...rest] = shapes;
	if (!first) continue;
	features.push({
		type: "Feature",
		properties: { geoparkId: id },
		geometry: {
			type: "MultiPolygon",
			coordinates: simplify(polygonClipping.union(first, ...rest)),
		},
	});
}

writeFileSync(
	OUT,
	`${JSON.stringify({ type: "FeatureCollection", features })}\n`,
);
console.log(`${features.length} geoparks → ${OUT}`);
