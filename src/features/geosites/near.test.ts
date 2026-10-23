import { describe, expect, it } from "vitest";
import { bboxContains, hiddenByFilters, rankFromPoint } from "./near";
import type { GeositeSummary } from "./schemas";

const site = (slug: string, coordinates: [number, number]): GeositeSummary =>
	({
		id: slug,
		slug,
		name: slug,
		municipality: "X",
		state: "CE",
		categories: [],
		relevance: "national",
		location: { type: "Point", coordinates },
		locationIsSensitive: false,
		locationIsApproximate: false,
		distanceMeters: 0,
	}) as GeositeSummary;

describe("rankFromPoint", () => {
	it("sorts by distance from the point, rounded to 100 m", () => {
		const ranked = rankFromPoint(
			[site("far", [-39, -8]), site("near", [-39.01, -7.0])],
			[-39, -7],
		);
		expect(ranked.map((g) => g.slug)).toEqual(["near", "far"]);
		expect(ranked[0]?.distanceMeters).toBe(1100);
		expect((ranked[1]?.distanceMeters ?? 0) % 100).toBe(0);
	});
});

describe("bboxContains", () => {
	it("is inclusive at the edges", () => {
		expect(bboxContains([-40, -8, -38, -6], [-40, -6])).toBe(true);
		expect(bboxContains([-40, -8, -38, -6], [-37.9, -7])).toBe(false);
	});
});

// Regression: opening a geosite the filters exclude (search, geosite of the
// day) zoomed to it with an empty list and no explanation.
describe("hiddenByFilters", () => {
	const box: [number, number, number, number] = [-40, -8, -39, -7];
	const open = {
		slug: "pedra-cariri",
		location: { coordinates: [-39.7, -7.1] as [number, number] },
	};

	it("is true when the open geosite is in view but not listed", () => {
		expect(hiddenByFilters(open, [{ slug: "outro" }], box, true)).toBe(true);
	});

	it("is false when it's listed, out of view, unfiltered or none is open", () => {
		expect(hiddenByFilters(open, [{ slug: "pedra-cariri" }], box, true)).toBe(
			false,
		);
		expect(hiddenByFilters(open, [], [-50, -20, -49, -19], true)).toBe(false);
		expect(hiddenByFilters(open, [], box, false)).toBe(false);
		expect(hiddenByFilters(null, [], box, true)).toBe(false);
	});
});
