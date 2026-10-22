import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { haversineMeters } from "~/lib/geo";
import {
	ageOverlaps,
	publicPoint,
	rankNearby,
	type SummaryDoc,
} from "./geosites.server";

function summary(
	slug: string,
	coordinates: [number, number],
	locationIsSensitive = false,
): SummaryDoc {
	return {
		_id: new ObjectId(),
		slug,
		name: slug,
		municipality: "Teste",
		state: "CE",
		categories: ["paleontological"],
		relevance: "national",
		location: { type: "Point", coordinates },
		locationIsSensitive,
		locationIsApproximate: false,
		// What $geoNear reports: exact, and must not leak.
		distanceMeters: 1234.5678,
	};
}

describe("publicPoint", () => {
	it("rounds sensitive sites to 0.01° and leaves others exact", () => {
		const exact: [number, number] = [-39.123456, -7.654321];
		const loc = { type: "Point" as const, coordinates: exact };
		expect(publicPoint({ location: loc, locationIsSensitive: true })).toEqual([
			-39.12, -7.65,
		]);
		expect(publicPoint({ location: loc, locationIsSensitive: false })).toEqual(
			exact,
		);
	});
});

describe("rankNearby", () => {
	const origin: [number, number] = [-39.5, -7.1];

	it("orders by distance and keeps the limit", () => {
		const result = rankNearby(
			origin,
			[
				summary("far", [-39.0, -7.1]),
				summary("near", [-39.48, -7.1]),
				summary("mid", [-39.3, -7.1]),
			],
			2,
		);
		expect(result.map((g) => g.slug)).toEqual(["near", "mid"]);
		expect(result[0]?.id).toMatch(/^[0-9a-f]{24}$/);
	});

	it("measures sensitive sites from their rounded point, to the nearest 100 m", () => {
		const exact: [number, number] = [-39.123456, -7.654321];
		const [g] = rankNearby(origin, [summary("cave", exact, true)], 5);
		expect(g?.location.coordinates).toEqual([-39.12, -7.65]);
		expect(g?.distanceMeters).toBe(
			Math.round(haversineMeters(origin, [-39.12, -7.65]) / 100) * 100,
		);
		expect(g?.distanceMeters).not.toBe(1234.5678);
		expect((g?.distanceMeters ?? 1) % 100).toBe(0);
	});
});

describe("ageOverlaps", () => {
	it("matches ages overlapping the periods' span, not just touching it", () => {
		expect(ageOverlaps(["cretaceous", "cretaceous"])).toEqual({
			"geologicAge.maxMa": { $gt: 66 },
			"geologicAge.minMa": { $lt: 145 },
		});
	});

	it("has no lower limit when the oldest period is included", () => {
		expect(ageOverlaps(["cambrian", "archean"])).toEqual({
			"geologicAge.maxMa": { $gt: 485.4 },
			"geologicAge.minMa": { $exists: true },
		});
	});
});
