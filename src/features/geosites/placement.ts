/**
 * Checks that a GEOSSIT point lies in the state it names, from IBGE's state
 * outlines and municipality centres (`brazil-places.json`, built by
 * `pnpm geo:places`). A few GEOSSIT records carry 0,0, whole-degree
 * placeholders or swapped digits; those are moved to their municipality's
 * centre and flagged as approximate. Pure, so it can be tested.
 */
import { foldName } from "~/features/geoparks/outlines";
import { haversineMeters } from "~/lib/geo";

type Point = [number, number];
type Ring = Point[];
type MultiPolygon = Ring[][];

export type BrazilPlaces = {
	/** IBGE edition the outlines and centres come from. */
	edition: number;
	/** Each state's outline (UF code → multipolygon), simplified to ~1 km. */
	states: Record<string, MultiPolygon>;
	/** UF code → folded municipality name (`foldName`) → centre. */
	municipalities: Record<string, Record<string, Point>>;
};

/**
 * How far outside its state a point may lie and still count as placed:
 * covers the outline's ~1 km simplification, reefs and beachrocks just off
 * the coast, and sites on a river that forms the state line.
 */
export const STATE_TOLERANCE_KM = 5;

/** Both coordinates whole degrees: a placeholder, not a surveyed point. */
export function isPlaceholderPoint([lng, lat]: Point): boolean {
	const whole = (v: number) => Math.abs(v - Math.round(v)) < 1e-6;
	return whole(lng) && whole(lat);
}

function inRing(ring: Ring, [x, y]: Point): boolean {
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [xi, yi] = ring[i] as Point;
		const [xj, yj] = ring[j] as Point;
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
			inside = !inside;
	}
	return inside;
}

export function inMultiPolygon(shape: MultiPolygon, p: Point): boolean {
	return shape.some(
		([outer, ...holes]) =>
			!!outer && inRing(outer, p) && !holes.some((h) => inRing(h, p)),
	);
}

/** Distance from `p` to the nearest edge of `shape`, in km. */
export function kmToEdge(shape: MultiPolygon, p: Point): number {
	const k = Math.cos((p[1] * Math.PI) / 180);
	let best = Number.POSITIVE_INFINITY;
	for (const polygon of shape)
		for (const ring of polygon)
			for (let i = 1; i < ring.length; i++) {
				const [ax, ay] = ring[i - 1] as Point;
				const [bx, by] = ring[i] as Point;
				// Project onto the segment in a locally flat frame.
				const [dx, dy] = [(bx - ax) * k, by - ay];
				const [px, py] = [(p[0] - ax) * k, p[1] - ay];
				const len = dx * dx + dy * dy;
				const t =
					len === 0 ? 0 : Math.max(0, Math.min(1, (px * dx + py * dy) / len));
				const closest: Point = [ax + (t * dx) / k, ay + t * dy];
				best = Math.min(best, haversineMeters(p, closest) / 1_000);
			}
	return best;
}

export type Placement =
	| { status: "ok"; point: Point }
	| {
			status: "approximate";
			point: Point;
			reason: "placeholder" | "outside-state";
	  }
	| { status: "unplaceable"; reason: string };

/**
 * Where to put a geosite: its own point when it lies in (or within
 * `STATE_TOLERANCE_KM` of) its state and isn't a placeholder; otherwise
 * its municipality's centre. States missing from `places` are trusted.
 */
export function placeGeosite(
	point: Point,
	state: string,
	municipality: string,
	places: BrazilPlaces,
): Placement {
	const outline = places.states[state];
	const reason = isPlaceholderPoint(point)
		? "placeholder"
		: outline &&
				!inMultiPolygon(outline, point) &&
				kmToEdge(outline, point) > STATE_TOLERANCE_KM
			? "outside-state"
			: undefined;
	if (!reason) return { status: "ok", point };
	const centre = places.municipalities[state]?.[foldName(municipality)];
	return centre
		? { status: "approximate", point: centre, reason }
		: {
				status: "unplaceable",
				reason: `point ${point.join(",")} is ${reason} and IBGE has no municipality "${municipality}" in ${state}`,
			};
}
