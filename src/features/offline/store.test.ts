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
	...extra,
});

const saved: SavedGeoparks = {
	araripe: {
		savedAt: "2026-10-21T10:00:00.000Z",
		failed: 0,
		geosites: [
			site("perto", [-39.5, -7.2]),
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

	it("returns nothing with an age filter it can't apply", () => {
		expect(
			savedGeositesInBounds(saved, {
				bbox: box,
				age: ["cretaceous", "cretaceous"],
			}),
		).toEqual([]);
	});
});

describe("parseSavedGeoparks", () => {
	it("round-trips and rejects junk", () => {
		expect(parseSavedGeoparks(JSON.stringify(saved))).toEqual(saved);
		expect(parseSavedGeoparks('{"atlantis":{}}')).toEqual({});
		expect(parseSavedGeoparks("nope")).toEqual({});
	});
});
