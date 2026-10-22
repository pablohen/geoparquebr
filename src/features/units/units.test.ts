import { describe, expect, it } from "vitest";
import {
	groupByUnit,
	type UnitRow,
	unitAge,
	unitNames,
	unitSlug,
} from "./units";

describe("unitNames", () => {
	it("splits units on a contact and tidies spacing", () => {
		expect(unitNames("Formação Sousa /  Grupo  Rio do Peixe")).toEqual([
			"Formação Sousa",
			"Grupo Rio do Peixe",
		]);
	});

	it("keeps commas inside a unit's name and drops repeats", () => {
		expect(
			unitNames(
				"Litofácies Tombador, quartzo arenito / Litofácies Tombador, quartzo arenito",
			),
		).toEqual(["Litofácies Tombador, quartzo arenito"]);
	});

	it("has nothing for a missing formation", () => {
		expect(unitNames(undefined)).toEqual([]);
		expect(unitNames("")).toEqual([]);
	});
});

describe("unitSlug", () => {
	it("makes accent-free, hyphenated slugs", () => {
		expect(unitSlug("Formação São Desidério")).toBe("formacao-sao-desiderio");
		expect(unitSlug("Litofácies Tombador, quartzo arenito")).toBe(
			"litofacies-tombador-quartzo-arenito",
		);
		expect(unitSlug("Corpo Plúton  Bravo")).toBe("corpo-pluton-bravo");
	});
});

const row = (
	slug: string,
	formation: string,
	age?: Partial<UnitRow["geologicAge"]>,
): UnitRow => ({
	slug,
	name: slug,
	municipality: "Sousa",
	state: "PB",
	geologicAge: { period: "Cretáceo", formation, mapScale: 1_000_000, ...age },
});

describe("groupByUnit", () => {
	it("puts a geosite on a contact under each unit", () => {
		const groups = groupByUnit([
			row("a", "Formação Sousa"),
			row("b", "Formação Sousa / Formação Antenor Navarro"),
		]);
		expect(groups.get("formacao-sousa")?.rows.map((r) => r.slug)).toEqual([
			"a",
			"b",
		]);
		expect(
			groups.get("formacao-antenor-navarro")?.rows.map((r) => r.slug),
		).toEqual(["b"]);
	});
});

describe("unitAge", () => {
	it("reads the age only where the unit is alone at the point", () => {
		const age = unitAge([
			row("a", "Formação Sousa", { minMa: 130, maxMa: 140 }),
			row("b", "Formação Sousa", { minMa: 125, maxMa: 135 }),
			row("c", "Formação Sousa / Grupo X", {
				minMa: 1,
				maxMa: 2000,
				period: "Mistura",
			}),
		]);
		expect(age).toEqual({
			period: "Cretáceo",
			minMa: 125,
			maxMa: 140,
			mapScale: 1_000_000,
		});
	});

	it("has no age for a unit only seen on contacts", () => {
		expect(unitAge([row("c", "Formação Sousa / Grupo X")])).toBeUndefined();
	});
});
