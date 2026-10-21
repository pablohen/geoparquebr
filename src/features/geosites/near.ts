/**
 * "Perto de mim": the listed geosites ranked by straight-line distance from
 * the traveller. Runs on the device; the position never reaches the server.
 * Distances go to public points (rounded for sensitive sites) and are
 * rounded to 100 m, as in `rankNearby`.
 */
import { type BBox, haversineMeters } from "~/lib/geo";
import type { GeositeSummary } from "./schemas";

export function rankFromPoint(
	geosites: GeositeSummary[],
	point: [number, number],
): GeositeSummary[] {
	return geosites
		.map((g) => ({
			...g,
			distanceMeters:
				Math.round(haversineMeters(point, g.location.coordinates) / 100) * 100,
		}))
		.sort((a, b) => a.distanceMeters - b.distanceMeters);
}

export const bboxContains = (
	[w, s, e, n]: BBox,
	[lng, lat]: [number, number],
) => lng >= w && lng <= e && lat >= s && lat <= n;
