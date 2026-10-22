import { describe, expect, it } from "vitest";
import type { GeoparkGeosite } from "~/features/geoparks/schemas";
import {
	parseSavedGeoparks,
	type SavedGeoparks,
	savedGeositesInBounds,
} from "./store";

const site = (
	slug: string,
	coordinates: [number, number],
	extra: Partial<GeoparkGeosite> = {},
): GeoparkGeosite => ({
	id: slug,
	slug,
	name: slug,
	municipality: "Teste",
	state: "CE",
	categories: ["paleontological"],
	relevance: "national",
	location: { type: "Point", coordinates },
	locationIsSensitive: false,
	locationIsApproximate: false,
	...extra,
});

const saved: SavedGeoparks = {
	araripe: {
		savedAt: "2026-10-21T10:00:00.000Z",
		failed: 0,
		geosites: [
			// Crato Formation: Aptian, Early Cretaceous.
			site("perto", [-39.5, -7.2], {
				minMa: 113,
				maxMa: 125,
				scores: {
					scientific: 355,
					tourism: 275,
					didactic: 305,
					vulnerability: 295,
				},
			}),
			site("longe", [-39.9, -7.4], {
				categories: ["speleological"],
				relevance: "international",
			}),
			site("fora", [-36.5, -6.3]),
		],
	},
};
const box: [number, number, number, number] = [-40, -7.5, -39, -7];

describe("savedGeositesInBounds", () => {
	it("lists saved geosites inside the box, nearest the centre first", () => {
		const list = savedGeositesInBounds(saved, { bbox: box });
		expect(list.map((g) => g.slug)).toEqual(["perto", "longe"]);
		expect(list[0]?.geoparkId).toBe("araripe");
		expect(list[0]?.distanceMeters).toBeGreaterThan(0);
	});

	it("applies category, relevance and geopark filters", () => {
		expect(
			savedGeositesInBounds(saved, {
				bbox: box,
				categories: ["speleological"],
			}).map((g) => g.slug),
		).toEqual(["longe"]);
		expect(
			savedGeositesInBounds(saved, { bbox: box, relevance: "international" })
				.length,
		).toBe(1);
		expect(
			savedGeositesInBounds(saved, { bbox: box, geoparkId: "serido" }),
		).toEqual([]);
	});

	it("applies the state filter", () => {
		expect(
			savedGeositesInBounds(saved, { bbox: box, states: ["CE"] }).length,
		).toBe(2);
		expect(savedGeositesInBounds(saved, { bbox: box, states: ["PB"] })).toEqual(
			[],
		);
	});

	// Regression: offline, the age and score filters always listed nothing.
	it("applies the age filter by overlap, dropping undated geosites", () => {
		const slugs = (
			age: ["cretaceous", "cretaceous"] | ["jurassic", "jurassic"],
		) => savedGeositesInBounds(saved, { bbox: box, age }).map((g) => g.slug);
		expect(slugs(["cretaceous", "cretaceous"])).toEqual(["perto"]);
		expect(slugs(["jurassic", "jurassic"])).toEqual([]);
	});

	it("applies the minimum score filter", () => {
		const slugs = (min: number) =>
			savedGeositesInBounds(saved, {
				bbox: box,
				minScore: { key: "tourism", min },
			}).map((g) => g.slug);
		expect(slugs(275)).toEqual(["perto"]);
		expect(slugs(276)).toEqual([]);
	});
});

describe("parseSavedGeoparks", () => {
	it("round-trips and rejects junk", () => {
		expect(parseSavedGeoparks(JSON.stringify(saved))).toEqual(saved);
		expect(parseSavedGeoparks('{"atlantis":{}}')).toEqual({});
		expect(parseSavedGeoparks("nope")).toEqual({});
	});
});
