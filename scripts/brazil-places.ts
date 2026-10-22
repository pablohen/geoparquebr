/**
 * Builds src/features/geosites/brazil-places.json: each state's outline and
 * each municipality's centre, from IBGE's official boundaries (geoftp). The
 * GEOSSIT sync uses them to catch points that lie outside their state
 * (`placement.ts`). Re-run when IBGE publishes a new edition.
 * Usage: pnpm geo:places
 */
import { writeFileSync } from "node:fs";
import { unzipSync } from "fflate";
import { read } from "shapefile";
import { foldName, simplifyRing } from "~/features/geoparks/outlines";
import {
	type BrazilPlaces,
	inMultiPolygon,
} from "~/features/geosites/placement";

const EDITION = 2025;
const BASE = `https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_${EDITION}`;
const OUT = "src/features/geosites/brazil-places.json";
/** ~1 km; `STATE_TOLERANCE_KM` absorbs it. */
const TOLERANCE = 0.01;

type Point = [number, number];
type MultiPolygon = Point[][][];
type Feature = {
	properties: Record<string, string> | null;
	geometry:
		| { type: "Polygon"; coordinates: Point[][] }
		| { type: "MultiPolygon"; coordinates: MultiPolygon }
		| null;
};

async function shapes(path: string): Promise<Feature[]> {
	const url = `${BASE}/${path}`;
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
	const fc = (await read(bytes(shp), bytes(dbf), {
		encoding: "utf-8",
	})) as unknown as {
		features: Feature[];
	};
	return fc.features;
}

const polygons = (g: NonNullable<Feature["geometry"]>): MultiPolygon =>
	g.type === "Polygon" ? [g.coordinates] : g.coordinates;

const round = (v: number, digits: number) =>
	Math.round(v * 10 ** digits) / 10 ** digits;

/** An islet too small to simplify, as its bounding box. */
function boxOf(ring: Point[]): Point[] {
	const xs = ring.map(([x]) => x);
	const ys = ring.map(([, y]) => y);
	const [w, e, s, n] = [
		Math.min(...xs),
		Math.max(...xs),
		Math.min(...ys),
		Math.max(...ys),
	];
	return [
		[w, s],
		[e, s],
		[e, n],
		[w, n],
		[w, s],
	];
}

/** Simplified and rounded to ~100 m; islets become their bounding boxes. */
const simplify = (shape: MultiPolygon): MultiPolygon =>
	shape.map((polygon) =>
		polygon.map((ring) => {
			const simple = simplifyRing(ring, TOLERANCE);
			// simplifyRing hands back the ring itself when it can't shrink it.
			return (simple === ring && ring.length > 5 ? boxOf(ring) : simple).map(
				([x, y]): Point => [round(x, 3), round(y, 3)],
			);
		}),
	);

function ringArea(ring: Point[]): number {
	let a = 0;
	for (let i = 1; i < ring.length; i++) {
		const [x0, y0] = ring[i - 1] as Point;
		const [x1, y1] = ring[i] as Point;
		a += x0 * y1 - x1 * y0;
	}
	return a / 2;
}

/**
 * The municipality's centre: the centroid of its largest part, or, when that
 * falls outside (a crescent-shaped municipality), the middle of the widest
 * stretch of land along the centroid's latitude.
 */
function centreOf(shape: MultiPolygon): Point {
	const largest = [...shape].sort(
		(a, b) => Math.abs(ringArea(b[0] ?? [])) - Math.abs(ringArea(a[0] ?? [])),
	)[0];
	const outer = largest?.[0];
	if (!outer) throw new Error("empty municipality");
	let [cx, cy, area] = [0, 0, 0];
	for (let i = 1; i < outer.length; i++) {
		const [x0, y0] = outer[i - 1] as Point;
		const [x1, y1] = outer[i] as Point;
		const cross = x0 * y1 - x1 * y0;
		area += cross;
		cx += (x0 + x1) * cross;
		cy += (y0 + y1) * cross;
	}
	const centroid: Point = [cx / (3 * area), cy / (3 * area)];
	if (inMultiPolygon([largest], centroid)) return centroid;
	const xs: number[] = [];
	for (let i = 1; i < outer.length; i++) {
		const [x0, y0] = outer[i - 1] as Point;
		const [x1, y1] = outer[i] as Point;
		if (y0 > centroid[1] !== y1 > centroid[1])
			xs.push(x0 + ((centroid[1] - y0) * (x1 - x0)) / (y1 - y0));
	}
	xs.sort((a, b) => a - b);
	let best: Point = centroid;
	let width = 0;
	for (let i = 0; i + 1 < xs.length; i += 2) {
		const [a, b] = [xs[i] as number, xs[i + 1] as number];
		if (b - a > width) [best, width] = [[(a + b) / 2, centroid[1]], b - a];
	}
	return best;
}

const places: BrazilPlaces = {
	edition: EDITION,
	states: {},
	municipalities: {},
};

for (const f of await shapes(`Brasil/BR_UF_${EDITION}.zip`)) {
	const uf = f.properties?.SIGLA_UF;
	if (!uf || !f.geometry) continue;
	places.states[uf] = simplify(polygons(f.geometry));
}
console.log(`${Object.keys(places.states).length} states`);

for (const uf of Object.keys(places.states).sort()) {
	const towns: Record<string, Point> = {};
	for (const f of await shapes(`UFs/${uf}/${uf}_Municipios_${EDITION}.zip`)) {
		const name = f.properties?.NM_MUN;
		if (!name || !f.geometry) continue;
		const [x, y] = centreOf(polygons(f.geometry));
		towns[foldName(name)] = [round(x, 4), round(y, 4)];
	}
	places.municipalities[uf] = towns;
	console.log(`  ${uf}: ${Object.keys(towns).length} municipalities`);
}

writeFileSync(OUT, `${JSON.stringify(places)}\n`);
console.log(`→ ${OUT}`);
