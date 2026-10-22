/**
 * Geopark outlines for the map: each geopark's municipalities, from IBGE's
 * official boundaries, merged into one shape by `pnpm geo:outlines` and
 * served as a static file. Pure helpers, so the matching can be tested.
 */
import type { GeoparkId } from "~/features/geosites/schemas";

export const GEOPARK_OUTLINES_URL = "/data/geopark-outlines.geojson";

/** "Caçapava do Sul" → "cacapava do sul", as GEOPARK_MUNICIPALITIES keys are. */
export const foldName = (s: string) =>
	s
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();

/** Whether a "UF:name" key names this municipality (IBGE's NM_MUN). */
export const isMunicipality = (key: string, name: string) =>
	key.slice(key.indexOf(":") + 1) === foldName(name);

type Point = [number, number];

/** Distance from p to the segment a–b, in degrees (fine at these scales). */
function segmentDistance(p: Point, a: Point, b: Point): number {
	const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
	const t =
		dx === 0 && dy === 0
			? 0
			: Math.max(
					0,
					Math.min(
						1,
						((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy),
					),
				);
	return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/**
 * Douglas–Peucker on a closed ring: drops points closer than `tolerance`
 * (degrees) to the line between their neighbours, keeps it closed and at
 * least a triangle.
 */
export function simplifyRing(ring: Point[], tolerance: number): Point[] {
	if (ring.length <= 4) return ring;
	const keep = new Array<boolean>(ring.length).fill(false);
	keep[0] = keep[ring.length - 1] = true;
	// The point farthest from the first one splits the ring in two halves.
	let far = 1;
	let farDist = 0;
	for (let i = 1; i < ring.length - 1; i++) {
		const d = Math.hypot(
			(ring[i]?.[0] ?? 0) - (ring[0]?.[0] ?? 0),
			(ring[i]?.[1] ?? 0) - (ring[0]?.[1] ?? 0),
		);
		if (d > farDist) [far, farDist] = [i, d];
	}
	keep[far] = true;
	const stack: [number, number][] = [
		[0, far],
		[far, ring.length - 1],
	];
	while (stack.length > 0) {
		const [from, to] = stack.pop() as [number, number];
		let index = -1;
		let max = tolerance;
		for (let i = from + 1; i < to; i++) {
			const d = segmentDistance(
				ring[i] as Point,
				ring[from] as Point,
				ring[to] as Point,
			);
			if (d > max) [index, max] = [i, d];
		}
		if (index !== -1) {
			keep[index] = true;
			stack.push([from, index], [index, to]);
		}
	}
	const out = ring.filter((_, i) => keep[i]);
	return out.length >= 4 ? out : ring;
}

export type OutlineProperties = { geoparkId: GeoparkId };
