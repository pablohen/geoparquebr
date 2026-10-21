import { describe, expect, it } from "vitest";
import {
	type ComparableGeosite,
	canonical,
	diffGeosites,
	hasChanges,
} from "./changes";

const geosite = (
	id: number,
	extra: Partial<ComparableGeosite> = {},
): ComparableGeosite => ({
	slug: `site-${id}`,
	name: `Site ${id}`,
	source: { id },
	summary: "Resumo",
	location: { coordinates: [-39.5, -7.1] },
	municipality: "Nova Olinda",
	state: "CE",
	categories: ["paleontological", "stratigraphic"],
	relevance: "national",
	geologicAge: { period: "Cretáceo", minMa: 100.5, maxMa: 125 },
	...extra,
});

describe("canonical", () => {
	it("ignores key order and missing values", () => {
		expect(canonical({ b: 1, a: 2, c: undefined, d: null })).toBe(
			canonical({ a: 2, b: 1 }),
		);
	});
});

describe("diffGeosites", () => {
	it("finds added, changed (by field) and removed geosites by GEOSSIT id", () => {
		const before = [geosite(1), geosite(2), geosite(3, { name: "Gone" })];
		const after = [
			geosite(1),
			geosite(2, {
				name: "Site 2 renamed",
				slug: "site-2-renamed",
				categories: ["stratigraphic", "paleontological"], // same set, new order
				geologicAge: { maxMa: 125, minMa: 100.5, period: "Cretáceo" }, // same
				coverImageUrl: "https://example.org/photo.jpg",
			}),
			geosite(4, { name: "Brand new" }),
		];
		expect(diffGeosites(before, after)).toEqual({
			added: [{ slug: "site-4", name: "Brand new" }],
			changed: [
				{
					slug: "site-2-renamed",
					name: "Site 2 renamed",
					fields: ["name", "photo"],
				},
			],
			removed: [{ name: "Gone" }],
		});
	});

	it("reports nothing for an identical import", () => {
		const sites = [geosite(1), geosite(2)];
		const changes = diffGeosites(sites, structuredClone(sites));
		expect(hasChanges(changes)).toBe(false);
	});

	it("notices description, location, municipality and geopark changes", () => {
		const [change] = diffGeosites(
			[geosite(1)],
			[
				geosite(1, {
					description: "Texto novo",
					location: { coordinates: [-39.6, -7.1] },
					municipality: "Santana do Cariri",
					geoparkId: "araripe",
				}),
			],
		).changed;
		expect(change?.fields).toEqual([
			"description",
			"location",
			"municipality",
			"geopark",
		]);
	});
});
