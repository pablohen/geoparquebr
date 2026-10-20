import { describe, expect, it } from "vitest";
import { shortTaxon, splitTaxa, tidyCase } from "./taxa";

describe("tidyCase", () => {
	it("sentence-cases names recorded in ALL CAPS", () => {
		expect(tidyCase("DASTILBE ELONGATUS")).toBe("Dastilbe elongatus");
	});

	it("leaves mixed case alone apart from the first letter", () => {
		expect(tidyCase("tupandactylus imperator")).toBe("Tupandactylus imperator");
		expect(tidyCase("Cladocyclus gardneri Agassiz")).toBe(
			"Cladocyclus gardneri Agassiz",
		);
	});
});

describe("splitTaxa", () => {
	it("splits comma-separated hierarchies", () => {
		expect(splitTaxa("lepidosauria, squamata, tijubina pontei")).toEqual([
			"Lepidosauria",
			"Squamata",
			"Tijubina pontei",
		]);
	});

	it("keeps authorship years with their name instead of inventing taxa", () => {
		expect(splitTaxa("DASTILBE ELONGATUS SANTOS, 1947")).toEqual([
			"Dastilbe elongatus santos, 1947",
		]);
		expect(
			splitTaxa("Cladocyclus gardneri Agassiz, 1841; Rhacolepis sp."),
		).toEqual(["Cladocyclus gardneri Agassiz, 1841", "Rhacolepis sp."]);
	});

	it("merges several fields, skipping blanks and duplicates", () => {
		expect(splitTaxa(undefined, "AVE, PENA DE AVE", "", "Ave")).toEqual([
			"Ave",
			"Pena de ave",
		]);
	});

	it("returns nothing for empty input", () => {
		expect(splitTaxa(undefined, "  ")).toEqual([]);
	});
});

describe("shortTaxon", () => {
	it.each([
		["Dastilbe elongatus santos, 1947", "Dastilbe elongatus"],
		["Cladocyclus gardneri Agassiz, 1841", "Cladocyclus gardneri"],
		["Tijubina pontei Bonfim-Júnior & Marques, 1997", "Tijubina pontei"],
		["Dastilbe Jordan, 1910", "Dastilbe"],
		["Tupandactylus imperator", "Tupandactylus imperator"],
		["Pena de ave", "Pena de ave"],
		["Araneae", "Araneae"],
	])("%s → %s", (input, expected) => {
		expect(shortTaxon(input)).toBe(expected);
	});
});
