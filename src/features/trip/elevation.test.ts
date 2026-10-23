import { describe, expect, it } from "vitest";
import {
	decodeTerrarium,
	niceTicks,
	profileStats,
	profileZoom,
	samplePath,
	smooth,
	tilePixel,
} from "./elevation";

describe("samplePath", () => {
	const stops: [number, number][] = [
		[-39.5, -7.2],
		[-39.4, -7.2],
		[-39.4, -7.0],
	];

	it("samples both legs, starting and ending at the stops", () => {
		const samples = samplePath(stops, 30);
		expect(samples[0]?.point).toEqual([-39.5, -7.2]);
		expect(samples.at(-1)?.point).toEqual([-39.4, -7.0]);
		expect(samples.find((s) => s.leg === 1)?.leg).toBe(1);
		// The middle stop appears once, as the end of leg 0.
		expect(
			samples.filter((s) => s.point[0] === -39.4 && s.point[1] === -7.2),
		).toHaveLength(1);
		// Distances only grow.
		for (let i = 1; i < samples.length; i++)
			expect(samples[i]?.meters).toBeGreaterThan(samples[i - 1]?.meters ?? 0);
	});

	it("needs two distinct points", () => {
		expect(samplePath([[-39.5, -7.2]])).toEqual([]);
		expect(
			samplePath([
				[-39.5, -7.2],
				[-39.5, -7.2],
			]),
		).toEqual([]);
	});
});

describe("tilePixel and decodeTerrarium", () => {
	it("finds the tile and pixel of a point", () => {
		// Zoom 0: one tile; (0, 0) is its centre.
		expect(tilePixel([0, 0], 0)).toEqual({
			tile: { z: 0, x: 0, y: 0 },
			px: 128,
			py: 128,
		});
		expect(tilePixel([-39.5, -7.2], 10).tile).toEqual({
			z: 10,
			x: 399,
			y: 532,
		});
	});

	it("decodes Terrarium pixels to metres", () => {
		expect(decodeTerrarium(128, 0, 0)).toBe(0);
		expect(decodeTerrarium(131, 232, 128)).toBeCloseTo(1000.5);
	});
});

// Regression: pixel jitter in the relief tiles counted as climbing, so a
// 190 km trip claimed 6.8 km of climb.
describe("profileStats", () => {
	it("doesn't count jitter on flat ground as climbing", () => {
		const flat = Array.from({ length: 60 }, (_, i) => 400 + (i % 2 ? 15 : -15));
		const stats = profileStats(flat);
		expect(stats.ascent).toBe(0);
		expect(stats.descent).toBe(0);
		expect([stats.min, stats.max]).toEqual([385, 415]);
	});

	it("totals a real climb and descent", () => {
		const up = Array.from({ length: 50 }, (_, i) => 100 + i * 20);
		const hill = [...up, ...[...up].reverse()];
		const stats = profileStats(hill);
		expect(stats.ascent).toBeGreaterThan(900);
		expect(stats.ascent).toBeLessThanOrEqual(980);
		expect(stats.descent).toBe(stats.ascent);
	});
});

describe("smooth", () => {
	it("averages each value with its neighbours", () => {
		expect(smooth([0, 10, 20, 30, 40], 1)).toEqual([5, 10, 20, 30, 35]);
	});
});

describe("profileZoom", () => {
	it("coarsens with the trip's length", () => {
		expect(profileZoom(30_000)).toBe(11);
		expect(profileZoom(150_000)).toBe(10);
		expect(profileZoom(1_500_000)).toBe(8);
		expect(profileZoom(3_000_000)).toBe(7);
	});
});

describe("niceTicks", () => {
	it("gives round values covering the range", () => {
		expect(niceTicks(412, 1_180)).toEqual([400, 600, 800, 1000, 1200]);
	});
});
