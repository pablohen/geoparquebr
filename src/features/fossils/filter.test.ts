import { describe, expect, it } from "vitest";
import {
	filterGenera,
	geoparkCounts,
	groupCounts,
	groupGenera,
	OTHER_GROUP,
} from "./filter";
import type { FossilGenusSummary } from "./schemas";

const genus = (
	name: string,
	cls: string | undefined,
	geoparks: FossilGenusSummary["geoparks"] = [],
	phylum?: string,
): FossilGenusSummary => ({
	slug: name.toLowerCase(),
	name,
	classification: { class: cls, phylum },
	geositeCount: 1,
	speciesCount: 0,
	geoparks,
});

const genera = [
	genus("Smilodon", "Mammalia"),
	genus("Glyptodon", "Mammalia"),
	genus("Dastilbe", undefined, ["araripe"], "Chordata"),
	genus("Cladocyclus", "Actinopteri", ["araripe"]),
	genus("Ignotus", undefined),
];

describe("filterGenera", () => {
	it("filters by name ignoring case and accents", () => {
		expect(filterGenera(genera, { q: "DON" }).map((g) => g.name)).toEqual([
			"Smilodon",
			"Glyptodon",
		]);
		expect(filterGenera([genus("Æ", "X")], { q: "æ" })).toHaveLength(1);
	});

	it("filters by group, with phylum and 'other' fallbacks", () => {
		expect(
			filterGenera(genera, { group: "Chordata" }).map((g) => g.name),
		).toEqual(["Dastilbe"]);
		expect(
			filterGenera(genera, { group: OTHER_GROUP }).map((g) => g.name),
		).toEqual(["Ignotus"]);
	});

	it("filters by geopark and combines filters", () => {
		expect(filterGenera(genera, { gp: "araripe" })).toHaveLength(2);
		expect(
			filterGenera(genera, { gp: "araripe", group: "Actinopteri" }).map(
				(g) => g.name,
			),
		).toEqual(["Cladocyclus"]);
		expect(filterGenera(genera, {})).toHaveLength(5);
	});
});

describe("counts", () => {
	it("orders groups largest first with 'other' last", () => {
		expect(groupCounts(genera)).toEqual([
			{ group: "Mammalia", count: 2 },
			{ group: "Actinopteri", count: 1 },
			{ group: "Chordata", count: 1 },
			{ group: OTHER_GROUP, count: 1 },
		]);
		expect(groupGenera(genera)[0]?.genera.map((g) => g.name)).toEqual([
			"Smilodon",
			"Glyptodon",
		]);
	});

	it("counts genera per geopark", () => {
		expect(geoparkCounts(genera)).toEqual([{ id: "araripe", count: 2 }]);
	});
});
