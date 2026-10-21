import { describe, expect, it } from "vitest";
import { acceptMatch, genusSlug, matchQuery } from "./taxonomy";

describe("matchQuery", () => {
	it.each([
		["dastilbe elongatus santos, 1947", "Dastilbe elongatus"],
		["DASTILBE ELONGATUS SANTOS", "Dastilbe"],
		["Dastilbe Jordan, 1910", "Dastilbe"],
		["Cladocyclus sp.", "Cladocyclus"],
		["Mawsonia gigas Mawson & Woodward, 1907", "Mawsonia gigas"],
		["Araripemys cf. barretoi", "Araripemys barretoi"],
		[
			"Scutatuspinosus itapagipensis  Santos & Correa",
			"Scutatuspinosus itapagipensis",
		],
		["Restos vegetais", "Restos vegetais"],
	])("%s → %s", (recorded, query) => {
		expect(matchQuery(recorded)).toBe(query);
	});

	it("skips what can't be a Latin name", () => {
		expect(matchQuery("1947")).toBeUndefined();
		expect(matchQuery("?")).toBeUndefined();
		expect(matchQuery("")).toBeUndefined();
	});
});

const gbif = (fields: Record<string, unknown>) => ({
	genus: "Dastilbe",
	genusKey: 4839123,
	phylum: "Chordata",
	kingdom: "Animalia",
	...fields,
});

describe("acceptMatch", () => {
	it("keeps exact species matches, with the accepted species", () => {
		expect(
			acceptMatch(
				"Dastilbe elongatus",
				gbif({
					matchType: "EXACT",
					rank: "SPECIES",
					canonicalName: "Dastilbe elongatus",
					species: "Dastilbe elongatus",
					order: "Gonorynchiformes",
				}),
			),
		).toEqual({
			genus: "Dastilbe",
			genusKey: 4839123,
			species: "Dastilbe elongatus",
			kingdom: "Animalia",
			phylum: "Chordata",
			class: undefined,
			order: "Gonorynchiformes",
			family: undefined,
		});
	});

	it("keeps exact genus matches without a species", () => {
		expect(
			acceptMatch("Dastilbe", gbif({ matchType: "EXACT", rank: "GENUS" }))
				?.species,
		).toBeUndefined();
	});

	it("keeps the recorded genus when the backbone lacks the species", () => {
		const raw = gbif({ matchType: "HIGHERRANK", rank: "GENUS" });
		expect(acceptMatch("Dastilbe novus", raw)?.genus).toBe("Dastilbe");
		expect(acceptMatch("Outrogenus novus", raw)).toBeNull();
	});

	it("drops fuzzy matches, ranks above genus and misses", () => {
		expect(
			acceptMatch("Dastilbi", gbif({ matchType: "FUZZY", rank: "GENUS" })),
		).toBeNull();
		expect(
			acceptMatch("Araneae", {
				matchType: "EXACT",
				rank: "ORDER",
				order: "Araneae",
			}),
		).toBeNull();
		expect(acceptMatch("Restos vegetais", { matchType: "NONE" })).toBeNull();
		expect(acceptMatch("x", "not json")).toBeNull();
	});
});

describe("genusSlug", () => {
	it("lowercases and strips anything but letters", () => {
		expect(genusSlug("Dastilbe")).toBe("dastilbe");
		expect(genusSlug("Ætosaurus")).toBe("aetosaurus");
	});
});
