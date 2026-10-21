/** `[west, south, east, north]` in degrees. */
export type BBox = [number, number, number, number];

const EARTH_RADIUS_M = 6_371_008.8;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversineMeters(
	[lng1, lat1]: readonly [number, number],
	[lng2, lat2]: readonly [number, number],
): number {
	const a =
		Math.sin(rad(lat2 - lat1) / 2) ** 2 +
		Math.cos(rad(lat1)) *
			Math.cos(rad(lat2)) *
			Math.sin(rad(lng2 - lng1) / 2) ** 2;
	return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

export function bboxCenter([w, s, e, n]: BBox): [number, number] {
	return [(w + e) / 2, (s + n) / 2];
}

/** Square-ish box around a point; good enough away from the poles. */
export function bboxAround(
	[lng, lat]: [number, number],
	radiusKm: number,
): BBox {
	const dLat = radiusKm / 111.32;
	const dLng = radiusKm / (111.32 * Math.cos(rad(lat)));
	return [
		Math.max(-180, lng - dLng),
		Math.max(-90, lat - dLat),
		Math.min(180, lng + dLng),
		Math.min(90, lat + dLat),
	];
}

/** Web-mercator world size in pixels at `zoom` (MapLibre uses 512-px tiles). */
const worldPx = (zoom: number) => 512 * 2 ** zoom;
const latToY = (lat: number, size: number) =>
	size * (0.5 - Math.log(Math.tan(Math.PI / 4 + rad(lat) / 2)) / (2 * Math.PI));
const yToLat = (y: number, size: number) =>
	(Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / size))) * 180) / Math.PI;

/**
 * The box a flat, north-up map of `width`×`height` pixels shows at this
 * centre and zoom. A tilted map's own bounds reach the horizon; this keeps
 * the URL viewport (and so the list) to the area around the centre.
 */
export function flatBBox(
	[lng, lat]: [number, number],
	zoom: number,
	width: number,
	height: number,
): BBox {
	const size = worldPx(zoom);
	const halfLng = (width / 2) * (360 / size);
	const y = latToY(lat, size);
	return [
		Math.max(-180, lng - halfLng),
		Math.max(-85, yToLat(y + height / 2, size)),
		Math.min(180, lng + halfLng),
		Math.min(85, yToLat(y - height / 2, size)),
	];
}

/** Rounds to ~11 m so URLs stay short and tiny map jitters don't re-query. */
export function roundBBox(bbox: BBox): BBox {
	return bbox.map((v) => Math.round(v * 1e4) / 1e4) as BBox;
}

/**
 * GeoJSON polygon for a lat/lng box with edges densified every `stepDeg`.
 * MongoDB treats polygon edges as geodesics, which bow towards the pole on
 * wide boxes; extra vertices keep the edges close to lines of latitude.
 */
export function bboxPolygon([w, s, e, n]: BBox, stepDeg = 1) {
	const ring: [number, number][] = [];
	const steps = (a: number, b: number) =>
		Math.max(1, Math.ceil(Math.abs(b - a) / stepDeg));
	const push = (from: [number, number], to: [number, number]) => {
		const k = steps(
			from[0] === to[0] ? from[1] : from[0],
			from[0] === to[0] ? to[1] : to[0],
		);
		for (let i = 0; i < k; i++)
			ring.push([
				from[0] + ((to[0] - from[0]) * i) / k,
				from[1] + ((to[1] - from[1]) * i) / k,
			]);
	};
	push([w, s], [e, s]);
	push([e, s], [e, n]);
	push([e, n], [w, n]);
	push([w, n], [w, s]);
	ring.push([w, s]);
	return { type: "Polygon" as const, coordinates: [ring] };
}
