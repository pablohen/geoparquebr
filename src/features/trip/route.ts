/**
 * Ordering a trip's stops and linking it to Google Maps. Pure: runs on the
 * device, so neither the stops nor the traveller's position reach the server.
 * Distances are straight lines between public points (approximate for
 * sensitive geosites), not road distances.
 */
import { haversineMeters } from "~/lib/geo";

type Point = readonly [number, number];

/** Length of an open path through `points`, starting at `start` if given. */
export function pathMeters(points: readonly Point[], start?: Point): number {
	const path = start ? [start, ...points] : points;
	let total = 0;
	for (let i = 1; i < path.length; i++)
		total += haversineMeters(path[i - 1] as Point, path[i] as Point);
	return total;
}

/**
 * A short visiting order: nearest neighbour, then 2-opt until nothing
 * improves. Returns indices into `points`. Without `start`, the path may
 * begin at any stop; the first stop is tried as well as the far ends.
 */
export function suggestOrder(
	points: readonly Point[],
	start?: Point,
): number[] {
	if (points.length < 2) return points.map((_, i) => i);
	const firsts = start ? [undefined] : [...new Set([0, ...extremes(points)])];
	let best: number[] = [];
	let bestLength = Number.POSITIVE_INFINITY;
	for (const first of firsts) {
		const order = twoOpt(nearestNeighbour(points, start, first), points, start);
		const length = pathMeters(
			order.map((i) => points[i] as Point),
			start,
		);
		if (length < bestLength - 1e-6) {
			best = order;
			bestLength = length;
		}
	}
	return best;
}

/** The two stops furthest apart: good ends for an open path. */
function extremes(points: readonly Point[]): number[] {
	let pair = [0, 0];
	let max = -1;
	for (let i = 0; i < points.length; i++)
		for (let j = i + 1; j < points.length; j++) {
			const d = haversineMeters(points[i] as Point, points[j] as Point);
			if (d > max) {
				max = d;
				pair = [i, j];
			}
		}
	return pair;
}

function nearestNeighbour(
	points: readonly Point[],
	start: Point | undefined,
	first: number | undefined,
): number[] {
	const left = new Set(points.map((_, i) => i));
	const order: number[] = [];
	let here = start;
	if (first !== undefined) {
		order.push(first);
		left.delete(first);
		here = points[first];
	}
	while (left.size > 0) {
		let next = -1;
		let nearest = Number.POSITIVE_INFINITY;
		for (const i of left) {
			const d = here ? haversineMeters(here, points[i] as Point) : 0;
			if (d < nearest) {
				nearest = d;
				next = i;
			}
		}
		order.push(next);
		left.delete(next);
		here = points[next];
	}
	return order;
}

/** Reverses segments while that shortens the open path. */
function twoOpt(
	order: number[],
	points: readonly Point[],
	start: Point | undefined,
): number[] {
	let route = order;
	let length = pathMeters(
		route.map((i) => points[i] as Point),
		start,
	);
	let improved = true;
	while (improved) {
		improved = false;
		for (let i = 0; i < route.length - 1; i++)
			for (let j = i + 1; j < route.length; j++) {
				const candidate = [
					...route.slice(0, i),
					...route.slice(i, j + 1).reverse(),
					...route.slice(j + 1),
				];
				const candidateLength = pathMeters(
					candidate.map((k) => points[k] as Point),
					start,
				);
				if (candidateLength < length - 1) {
					route = candidate;
					length = candidateLength;
					improved = true;
				}
			}
	}
	return route;
}

/** Straight-line distance to each stop from the one before (or `start`). */
export function legMeters(points: readonly Point[], start?: Point): number[] {
	return points.map((p, i) => {
		const previous = i === 0 ? start : points[i - 1];
		return previous ? haversineMeters(previous, p) : 0;
	});
}

/** Google Maps takes an origin, a destination and up to 8 waypoints per link. */
export const POINTS_PER_LINK = 10;

const latLng = ([lng, lat]: Point) => `${lat},${lng}`;

/**
 * Google Maps directions links covering the whole trip, split into legs of
 * at most POINTS_PER_LINK points that share their end and start. A trip that
 * fits one link and has no `start` leaves out the origin, so Google Maps
 * starts from wherever the traveller is; longer trips start at the first stop.
 */
export function googleMapsTripUrls(
	points: readonly Point[],
	start?: Point,
): string[] {
	const path = start ? [start, ...points] : [...points];
	if (path.length === 0) return [];
	if (path.length === 1 || (!start && path.length <= POINTS_PER_LINK - 1))
		return [directions(undefined, path)];
	const urls: string[] = [];
	for (let i = 0; i < path.length - 1; i += POINTS_PER_LINK - 1) {
		const leg = path.slice(i, i + POINTS_PER_LINK);
		urls.push(directions(leg[0], leg.slice(1)));
	}
	return urls;
}

function directions(
	origin: Point | undefined,
	stops: readonly Point[],
): string {
	const params = new URLSearchParams({ api: "1", travelmode: "driving" });
	if (origin) params.set("origin", latLng(origin));
	params.set("destination", latLng(stops.at(-1) as Point));
	if (stops.length > 1)
		params.set("waypoints", stops.slice(0, -1).map(latLng).join("|"));
	return `https://www.google.com/maps/dir/?${params}`;
}
