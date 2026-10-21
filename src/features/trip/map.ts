/** The trip as GeoJSON for the map: the route line and numbered stops. Pure. */
import type { FeatureCollection, LineString, Point } from "geojson";

export type TripPin = { slug: string; point: [number, number] };

export function tripFeatures(
	stops: TripPin[],
): FeatureCollection<LineString | Point> {
	return {
		type: "FeatureCollection",
		features: [
			...(stops.length > 1
				? [
						{
							type: "Feature" as const,
							properties: { kind: "route" },
							geometry: {
								type: "LineString" as const,
								coordinates: stops.map((s) => s.point),
							},
						},
					]
				: []),
			...stops.map((s, i) => ({
				type: "Feature" as const,
				properties: { kind: "stop", slug: s.slug, n: i + 1 },
				geometry: { type: "Point" as const, coordinates: s.point },
			})),
		],
	};
}

/**
 * Bounding box of the stops, padded by a share of its size (at least
 * `minPadDeg`) so pins at the edges aren't cut off.
 */
export function tripBBox(
	stops: TripPin[],
	{ share = 0.2, minPadDeg = 0.05 } = {},
): [number, number, number, number] | undefined {
	if (stops.length === 0) return undefined;
	const lngs = stops.map((s) => s.point[0]);
	const lats = stops.map((s) => s.point[1]);
	const [w, s, e, n] = [
		Math.min(...lngs),
		Math.min(...lats),
		Math.max(...lngs),
		Math.max(...lats),
	];
	const padLng = Math.max(minPadDeg, (e - w) * share);
	const padLat = Math.max(minPadDeg, (n - s) * share);
	return [w - padLng, s - padLat, e + padLng, n + padLat];
}
