/**
 * Builds Brazil's protected areas (unidades de conservação) from the
 * Ministry of the Environment's CNUC register (dados.mma.gov.br, CC BY):
 * - public/data/protected-areas.geojson: simplified to ~500 m, for the map's
 *   "Unidades de conservação" overlay;
 * - src/features/geosites/protected-areas.json: ~200 m, with bounding
 *   boxes, for the sync to name the areas each geosite lies in.
 * Re-run when MMA publishes a new edition (about twice a year).
 * Usage: pnpm geo:protected
 */
import { writeFileSync } from "node:fs";
import { unzipSync } from "fflate";
import { read } from "shapefile";
import { simplifyRing } from "~/features/geoparks/outlines";
import {
	type ProtectedAreaShape,
	toProtectedArea,
} from "~/features/geosites/protected-areas";

const DATASET =
	"https://dados.mma.gov.br/api/3/action/package_show?id=unidadesdeconservacao";
const MAP_OUT = "public/data/protected-areas.geojson";
const SYNC_OUT = "src/features/geosites/protected-areas.json";

type Point = [number, number];
type MultiPolygon = Point[][][];
type Feature = {
	properties: Record<string, string | null> | null;
	geometry:
		| { type: "Polygon"; coordinates: Point[][] }
		| { type: "MultiPolygon"; coordinates: MultiPolygon }
		| null;
};

/** The newest "Polígono CNUC YYYY_MM" resource. */
async function latestEdition(): Promise<{ name: string; url: string }> {
	const res = await fetch(DATASET);
	if (!res.ok) throw new Error(`${res.status} ${DATASET}`);
	const { result } = (await res.json()) as {
		result: { resources: { name: string; url: string }[] };
	};
	const polygons = result.resources
		.filter((r) => /^Pol[íi]gono CNUC \d{4}_\d{2}$/.test(r.name.trim()))
		.sort((a, b) => a.name.localeCompare(b.name));
	const latest = polygons.at(-1);
	if (!latest) throw new Error("no CNUC polygon resource");
	return latest;
}

const round = (v: number) => Math.round(v * 1e4) / 1e4;

/** Simplified and rounded; a polygon whose outer ring is too small goes. */
const simplify = (shape: MultiPolygon, tolerance: number): MultiPolygon =>
	shape.flatMap(([outer, ...holes]) => {
		const ring = (r: Point[]) => {
			const simple = simplifyRing(r, tolerance);
			// simplifyRing hands back the ring itself when it can't shrink it.
			return simple === r && r.length > 5
				? []
				: simple.map(([x, y]): Point => [round(x), round(y)]);
		};
		const kept = outer ? ring(outer) : [];
		if (kept.length < 4) return [];
		return [[kept, ...holes.map(ring).filter((h) => h.length >= 4)]];
	});

function bboxOf(shape: MultiPolygon): [number, number, number, number] {
	let [w, s, e, n] = [180, 90, -180, -90];
	for (const polygon of shape)
		for (const [x, y] of polygon[0] ?? []) {
			w = Math.min(w, x);
			e = Math.max(e, x);
			s = Math.min(s, y);
			n = Math.max(n, y);
		}
	return [w, s, e, n];
}

const edition = await latestEdition();
console.log(`${edition.name}: ${edition.url}`);
const res = await fetch(edition.url);
if (!res.ok) throw new Error(`${res.status} ${edition.url}`);
const files = unzipSync(new Uint8Array(await res.arrayBuffer()));
// The zip also holds a points layer (`_pontos`); take the polygons.
const find = (ext: string) =>
	Object.entries(files).find(
		([name]) => name.toLowerCase().endsWith(ext) && !/pontos/i.test(name),
	)?.[1];
const shp = find(".shp");
const dbf = find(".dbf");
if (!shp || !dbf) throw new Error("no polygon .shp/.dbf in the CNUC zip");
const bytes = (f: Uint8Array) =>
	f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength) as ArrayBuffer;
const fc = (await read(bytes(shp), bytes(dbf), {
	encoding: "utf-8",
})) as unknown as { features: Feature[] };

const mapFeatures = [];
const syncShapes: ProtectedAreaShape[] = [];
let skipped = 0;
for (const f of fc.features) {
	const area = toProtectedArea(f.properties ?? {});
	if (!area || !f.geometry) {
		skipped++;
		continue;
	}
	const shape =
		f.geometry.type === "Polygon"
			? [f.geometry.coordinates]
			: f.geometry.coordinates;
	const forMap = simplify(shape, 0.005);
	if (forMap.length > 0)
		mapFeatures.push({
			type: "Feature",
			properties: area,
			geometry: { type: "MultiPolygon", coordinates: forMap },
		});
	const forSync = simplify(shape, 0.002);
	if (forSync.length > 0)
		syncShapes.push({ ...area, bbox: bboxOf(forSync), shape: forSync });
}

writeFileSync(
	MAP_OUT,
	`${JSON.stringify({ type: "FeatureCollection", features: mapFeatures })}\n`,
);
writeFileSync(
	SYNC_OUT,
	`${JSON.stringify({ edition: edition.name, areas: syncShapes })}\n`,
);
console.log(
	`${mapFeatures.length} areas → ${MAP_OUT}; ${syncShapes.length} → ${SYNC_OUT}; ${skipped} skipped`,
);
