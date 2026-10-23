/**
 * The trip's elevation profile: points sampled along the straight legs
 * between stops, with altitudes read from Terrarium relief tiles (the same
 * ones the map shades). Pure; `elevation-tiles.ts` does the fetching.
 */
import { haversineMeters } from "~/lib/geo";

type Point = readonly [number, number];

/**
 * Tile zoom for a path: detailed for a day trip (zoom 11, ~75 m pixels),
 * coarser for a long road trip, so the profile needs about a dozen tiles
 * at most (a tile spans ~40000 km / 2^zoom).
 */
export function profileZoom(pathMeters: number): number {
	const km = pathMeters / 1_000;
	return km < 60 ? 11 : km < 200 ? 10 : km < 600 ? 9 : km < 2_000 ? 8 : 7;
}
/** Samples along the whole path. */
export const PROFILE_SAMPLES = 150;
/** Rises and falls smaller than this are tile noise, not climbing. */
const CLIMB_NOISE_M = 20;
/** Samples averaged on each side before totalling the climb. */
const SMOOTH_RADIUS = 2;

export type ProfileSample = {
	point: [number, number];
	/** Along the path from its start. */
	meters: number;
	/** Index of the leg (0 = first stop to second) the sample lies on. */
	leg: number;
};

/**
 * Evenly spaced samples along the straight legs, always including each
 * stop. Legs are interpolated in degrees, fine at trip scales.
 */
export function samplePath(
	points: readonly Point[],
	total = PROFILE_SAMPLES,
): ProfileSample[] {
	if (points.length < 2) return [];
	const lengths = points
		.slice(1)
		.map((p, i) => haversineMeters(points[i] as Point, p));
	const pathLength = lengths.reduce((a, b) => a + b, 0);
	if (pathLength === 0) return [];
	const step = pathLength / total;
	const out: ProfileSample[] = [];
	let start = 0;
	lengths.forEach((length, leg) => {
		const [x0, y0] = points[leg] as Point;
		const [x1, y1] = points[leg + 1] as Point;
		const n = Math.max(1, Math.round(length / step));
		// The leg's first point is the previous leg's last; add it once.
		for (let i = leg === 0 ? 0 : 1; i <= n; i++) {
			const t = i / n;
			out.push({
				point: [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t],
				meters: start + length * t,
				leg,
			});
		}
		start += length;
	});
	return out;
}

/** The tile holding a point at `zoom`, and the pixel within it (256 px tiles). */
export function tilePixel([lng, lat]: Point, zoom: number) {
	const scale = 2 ** zoom * 256;
	const x = ((lng + 180) / 360) * scale;
	const r = (lat * Math.PI) / 180;
	const y =
		((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * scale;
	return {
		tile: { z: zoom, x: Math.floor(x / 256), y: Math.floor(y / 256) },
		px: Math.min(255, Math.floor(x) % 256),
		py: Math.min(255, Math.floor(y) % 256),
	};
}

/** Terrarium encoding: (R × 256 + G + B / 256) − 32768 metres. */
export const decodeTerrarium = (r: number, g: number, b: number) =>
	r * 256 + g + b / 256 - 32768;

export type ProfileStats = {
	min: number;
	max: number;
	/**
	 * Total climb and descent, from altitudes averaged over five samples and
	 * ignoring changes under 20 m, so the tiles' pixel jitter doesn't count.
	 */
	ascent: number;
	descent: number;
};

/** A centred moving average over `radius` samples each side. */
export function smooth(values: readonly number[], radius = SMOOTH_RADIUS) {
	return values.map((_, i) => {
		const window = values.slice(
			Math.max(0, i - radius),
			Math.min(values.length, i + radius + 1),
		);
		return window.reduce((a, b) => a + b, 0) / window.length;
	});
}

/** Lowest and highest point (as read), and total climb and descent. */
export function profileStats(elevations: readonly number[]): ProfileStats {
	const smoothed = smooth(elevations);
	let ascent = 0;
	let descent = 0;
	let anchor = smoothed[0] ?? 0;
	for (const e of smoothed) {
		const d = e - anchor;
		if (d >= CLIMB_NOISE_M) {
			ascent += d;
			anchor = e;
		} else if (d <= -CLIMB_NOISE_M) {
			descent -= d;
			anchor = e;
		}
	}
	return {
		min: Math.min(...elevations),
		max: Math.max(...elevations),
		ascent: Math.round(ascent),
		descent: Math.round(descent),
	};
}

/** Clean axis ticks: about `count` round values covering [min, max]. */
export function niceTicks(min: number, max: number, count = 4): number[] {
	const span = Math.max(1, max - min);
	const raw = span / count;
	const magnitude = 10 ** Math.floor(Math.log10(raw));
	const step =
		[1, 2, 5, 10].map((f) => f * magnitude).find((s) => s >= raw) ??
		10 * magnitude;
	const ticks: number[] = [];
	for (let v = Math.floor(min / step) * step; v <= max + step / 2; v += step)
		ticks.push(Math.round(v));
	return ticks;
}
