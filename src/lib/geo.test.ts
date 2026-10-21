import { describe, expect, it } from "vitest";
import {
	bboxAround,
	bboxCenter,
	bboxPolygon,
	flatBBox,
	haversineMeters,
	roundBBox,
} from "./geo";

describe("haversineMeters", () => {
	it("is zero for the same point", () => {
		expect(haversineMeters([-39.69, -7.12], [-39.69, -7.12])).toBe(0);
	});

	it("measures one degree of latitude as ~111 km", () => {
		expect(haversineMeters([-39, -7], [-39, -8]) / 1_000).toBeCloseTo(111.2, 0);
	});

	it("is symmetric", () => {
		const a: [number, number] = [-39.69, -7.12];
		const b: [number, number] = [-38.23, -6.76];
		expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
	});
});

describe("bboxAround / bboxCenter", () => {
	it("centres the box on the point", () => {
		const box = bboxAround([-39.69, -7.12], 10);
		const [lng, lat] = bboxCenter(box);
		expect(lng).toBeCloseTo(-39.69, 6);
		expect(lat).toBeCloseTo(-7.12, 6);
	});

	it("reaches the radius in both directions", () => {
		const [w, s, e, n] = bboxAround([-39.69, -7.12], 10);
		expect(haversineMeters([-39.69, -7.12], [-39.69, n]) / 1_000).toBeCloseTo(
			10,
			1,
		);
		expect(haversineMeters([-39.69, -7.12], [e, -7.12]) / 1_000).toBeCloseTo(
			10,
			0,
		);
		expect(w).toBeLessThan(e);
		expect(s).toBeLessThan(n);
	});

	it("clamps to valid coordinates", () => {
		const [w, s, e, n] = bboxAround([179.9, 89.9], 500);
		expect(e).toBeLessThanOrEqual(180);
		expect(n).toBeLessThanOrEqual(90);
		expect(w).toBeGreaterThanOrEqual(-180);
		expect(s).toBeGreaterThanOrEqual(-90);
	});
});

describe("flatBBox", () => {
	it("spans the whole world at zoom 0 on a 512-px map", () => {
		const [w, , e] = flatBBox([0, 0], 0, 512, 512);
		expect(w).toBeCloseTo(-180);
		expect(e).toBeCloseTo(180);
	});

	it("halves the span with each zoom level and stays centred", () => {
		const a = flatBBox([-39.5, -7.2], 10, 800, 600);
		const b = flatBBox([-39.5, -7.2], 11, 800, 600);
		expect(a[2] - a[0]).toBeCloseTo(2 * (b[2] - b[0]), 10);
		expect(bboxCenter(a)[0]).toBeCloseTo(-39.5, 10);
		// Mercator: the centre latitude sits between south and north, near the middle.
		expect(a[1]).toBeLessThan(-7.2);
		expect(a[3]).toBeGreaterThan(-7.2);
		expect(bboxCenter(a)[1]).toBeCloseTo(-7.2, 2);
	});

	it("matches the span of an 800×600 map at zoom 10 near the equator", () => {
		// 800 px × 360° / (512 × 2^10 px) ≈ 0.549°.
		const [w, , e] = flatBBox([-39.5, -7.2], 10, 800, 600);
		expect(e - w).toBeCloseTo((800 * 360) / (512 * 1024), 10);
	});
});

describe("roundBBox", () => {
	it("rounds to 4 decimals", () => {
		expect(roundBBox([-40.123456, -7.987654, -39.000049, -6.5])).toEqual([
			-40.1235, -7.9877, -39, -6.5,
		]);
	});
});

describe("bboxPolygon", () => {
	it("returns a closed ring", () => {
		const ring = bboxPolygon([-41, -8, -38, -6]).coordinates[0];
		expect(ring?.[0]).toEqual(ring?.at(-1));
	});

	it("densifies long edges so they follow lines of latitude", () => {
		const ring = bboxPolygon([-74, -34, -34, 5]).coordinates[0] ?? [];
		// 40° wide and 39° tall at 1° steps → ~158 vertices instead of 5.
		expect(ring.length).toBeGreaterThan(150);
		const south = ring.filter(([, lat]) => lat === -34);
		expect(south.length).toBeGreaterThanOrEqual(40);
	});

	it("keeps every vertex on the box boundary", () => {
		const [w, s, e, n] = [-41, -8, -38, -6];
		for (const [lng, lat] of bboxPolygon([w, s, e, n]).coordinates[0] ?? []) {
			const onEdge = lng === w || lng === e || lat === s || lat === n;
			expect(onEdge).toBe(true);
		}
	});
});
