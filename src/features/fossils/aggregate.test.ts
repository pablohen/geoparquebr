import { describe, expect, it } from "vitest";
import { aggregateGenera, type GenusRecord } from "./aggregate";

const site = (slug: string) => ({
	slug,
	name: slug.toUpperCase(),
	municipality: "Nova Olinda",
	state: "CE",
});

const record = (
	slug: string,
	genus: string,
	genusKey: number,
	extra: Partial<GenusRecord> & { species?: string } = {},
): GenusRecord => ({
	geosite: site(slug),
	source: "sgb",
	match: { genus, genusKey, species: extra.species, class: "Actinopteri" },
	...extra,
});

describe("aggregateGenera", () => {
	it("groups records by genus, counting records per geosite", () => {
		const [genus] = aggregateGenera(
			[
				record("a", "Dastilbe", 1, {
					species: "Dastilbe elongatus",
					unit: "Membro Crato",
				}),
				record("a", "Dastilbe", 1, { source: "gbif", unit: "Crato Member" }),
				record("b", "Dastilbe", 1, { species: "Dastilbe crandalli" }),
			],
			"2026-10-21T00:00:00.000Z",
		);
		expect(genus).toMatchObject({
			slug: "dastilbe",
			name: "Dastilbe",
			gbifKey: 1,
			classification: { class: "Actinopteri" },
			species: ["Dastilbe crandalli", "Dastilbe elongatus"],
			units: ["Crato Member", "Membro Crato"],
			records: { sgb: 2, gbif: 1 },
		});
		expect(genus?.geosites.map((g) => [g.slug, g.records])).toEqual([
			["a", 2],
			["b", 1],
		]);
	});

	it("keeps slugs unique for homonym genera", () => {
		const genera = aggregateGenera(
			[record("a", "Ammonites", 7), record("a", "Ammonites", 3)],
			"2026-10-21T00:00:00.000Z",
		);
		expect(genera.map((g) => g.slug)).toEqual(["ammonites", "ammonites-7"]);
	});

	// Regression: values read back from the Mongo cache carry null, not undefined.
	it("treats nulls from the cache as missing", () => {
		const nullish = {
			...record("a", "Dastilbe", 1),
			unit: null,
			age: null,
			match: { genus: "Dastilbe", genusKey: 1, species: null, family: null },
		} as unknown as GenusRecord;
		const [genus] = aggregateGenera([nullish], "2026-10-21T00:00:00.000Z");
		expect(genus).toMatchObject({ species: [], units: [], ages: [] });
		expect(genus?.classification.family).toBeUndefined();
	});
});
