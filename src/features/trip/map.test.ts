import { describe, expect, it } from "vitest";
import { tripBBox, tripFeatures } from "./map";

const stops = [
	{ slug: "site-a", point: [-39, -7] as [number, number] },
	{ slug: "site-b", point: [-38, -6] as [number, number] },
];

describe("tripFeatures", () => {
	it("draws the route in trip order and numbers the stops", () => {
		const { features } = tripFeatures(stops);
		expect(features[0]).toMatchObject({
			properties: { kind: "route" },
			geometry: {
				type: "LineString",
				coordinates: [
					[-39, -7],
					[-38, -6],
				],
			},
		});
		expect(features.slice(1).map((f) => f.properties)).toEqual([
			{ kind: "stop", slug: "site-a", n: 1 },
			{ kind: "stop", slug: "site-b", n: 2 },
		]);
	});

	it("has no route for a single stop", () => {
		expect(tripFeatures(stops.slice(0, 1)).features).toHaveLength(1);
		expect(tripFeatures([]).features).toEqual([]);
	});
});

describe("tripBBox", () => {
	it("pads the stops' box by a share of its size", () => {
		const box = tripBBox(stops) ?? [];
		for (const [i, v] of [-39.2, -7.2, -37.8, -5.8].entries())
			expect(box[i]).toBeCloseTo(v);
		expect(tripBBox([])).toBeUndefined();
	});

	it("pads a single stop by the minimum", () => {
		const box = tripBBox(stops.slice(0, 1)) ?? [];
		for (const [i, v] of [-39.05, -7.05, -38.95, -6.95].entries())
			expect(box[i]).toBeCloseTo(v);
	});
});
