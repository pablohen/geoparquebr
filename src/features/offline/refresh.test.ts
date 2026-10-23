import { describe, expect, it } from "vitest";
import type { GeoparkGeosite } from "~/features/geoparks/schemas";
import { needsRefresh, staleGeoparks } from "./refresh";

const site = (extra: Partial<GeoparkGeosite> = {}): GeoparkGeosite => ({
	id: "x",
	slug: "x",
	name: "X",
	municipality: "Crato",
	state: "CE",
	categories: [],
	relevance: "national",
	location: { type: "Point", coordinates: [-39.4, -7.2] },
	locationIsSensitive: false,
	locationIsApproximate: false,
	...extra,
});

// Regression: geoparks saved before ages and scores were kept listed nothing
// offline with the age or score filter on, until saved again.
describe("needsRefresh", () => {
	it("flags a list where no geosite has an age or scores", () => {
		expect(needsRefresh([site(), site()])).toBe(true);
	});

	it("leaves current lists alone, even with undated geosites", () => {
		expect(needsRefresh([site(), site({ minMa: 100, maxMa: 120 })])).toBe(
			false,
		);
		expect(
			needsRefresh([
				site({
					scores: { scientific: 1, tourism: 1, didactic: 1, vulnerability: 1 },
				}),
			]),
		).toBe(false);
		expect(needsRefresh([])).toBe(false);
	});
});

describe("staleGeoparks", () => {
	it("lists the saved geoparks to refresh", () => {
		const entry = (geosites: GeoparkGeosite[]) => ({
			savedAt: "2026-10-20T10:00:00.000Z",
			failed: 0,
			geosites,
		});
		expect(
			staleGeoparks({
				araripe: entry([site()]),
				serido: entry([site({ minMa: 1, maxMa: 2 })]),
			}),
		).toEqual(["araripe"]);
	});
});
