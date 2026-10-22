import { describe, expect, it } from "vitest";
import type { StrataUnit } from "~/features/geology/schemas";
import {
	distinctiveName,
	geologicAgeFromUnits,
	pinPeriod,
	unitsNamedIn,
} from "./geologic-age";
import { GeositeInputSchema } from "./schemas";

const unit = (extra: Partial<StrataUnit>): StrataUnit => ({
	code: "X",
	name: "Formação Crato",
	...extra,
});

describe("geologicAgeFromUnits", () => {
	it("takes the one unit at the point", () => {
		expect(
			geologicAgeFromUnits(
				[unit({ period: "Cretáceo", minMa: 100.5, maxMa: 125 })],
				1_000_000,
			),
		).toEqual({
			period: "Cretáceo",
			formation: "Formação Crato",
			minMa: 100.5,
			maxMa: 125,
			mapScale: 1_000_000,
		});
	});

	it("spans every unit on a contact", () => {
		const age = geologicAgeFromUnits(
			[
				unit({
					name: "Unidade Búzios",
					period: "Ediacarano",
					minMa: 541,
					maxMa: 635,
				}),
				unit({
					name: "Complexo São José",
					period: "Riaciano",
					minMa: 2050,
					maxMa: 2300,
				}),
			],
			1_000_000,
		);
		expect(age).toMatchObject({
			period: "Ediacarano / Riaciano",
			formation: "Unidade Búzios / Complexo São José",
			minMa: 541,
			maxMa: 2300,
		});
	});

	it("ignores 0–0 Ma placeholders but keeps the period", () => {
		const age = geologicAgeFromUnits(
			[
				unit({
					name: "Depósitos litorâneos",
					period: "Neogeno",
					minMa: 0,
					maxMa: 0,
				}),
			],
			1_000_000,
		);
		expect(age).toMatchObject({ period: "Neogeno" });
		expect(age?.minMa).toBeUndefined();
		expect(age?.maxMa).toBeUndefined();
	});

	it("names the period by its range when the map gives none", () => {
		expect(
			geologicAgeFromUnits([unit({ minMa: 541, maxMa: 635 })], 1_000_000)
				?.period,
		).toBe("541–635 Ma");
	});

	it("returns nothing without units or anything datable", () => {
		expect(geologicAgeFromUnits([], 1_000_000)).toBeUndefined();
		expect(geologicAgeFromUnits([unit({})], 1_000_000)).toBeUndefined();
	});

	it("produces input the geosite schema accepts", () => {
		const geologicAge = geologicAgeFromUnits(
			[unit({ period: "Cretáceo", minMa: 100.5, maxMa: 125 })],
			1_000_000,
		);
		expect(
			GeositeInputSchema.shape.geologicAge.safeParse(geologicAge).success,
		).toBe(true);
	});
});

describe("distinctiveName", () => {
	it("drops the rank, accents and qualifiers", () => {
		expect(distinctiveName("Grupo Santana")).toBe("santana");
		expect(distinctiveName("Formação Exu")).toBe("exu");
		expect(distinctiveName("Unidade Granjeiro, suíte TTG")).toBe("granjeiro");
		expect(distinctiveName("Depósitos litorâneos")).toBe(
			"depositos litoraneos",
		);
	});
});

describe("unitsNamedIn", () => {
	const units = [
		unit({ name: "Grupo Santana" }),
		unit({ name: "Formação Santana dos Garrotes" }),
		unit({ name: "Formação Exu" }),
	];
	const names = (text: string) => unitsNamedIn(text, units).map((u) => u.name);

	it("matches a unit named in the text under another rank", () => {
		expect(names("Calcarios do Membro Crato da Formacao Santana.")).toEqual([
			"Grupo Santana",
		]);
	});

	it("tells similar names apart", () => {
		expect(names("Xistos da Formação Santana dos Garrotes")).toEqual([
			"Formação Santana dos Garrotes",
		]);
	});

	it("ignores names without a rank word (towns, rivers)", () => {
		expect(names("Lavras em Santana do Cariri, perto do rio Exu")).toEqual([]);
	});
});

describe("pinPeriod", () => {
	it("colours by the middle of the dated range", () => {
		expect(pinPeriod({ minMa: 100, maxMa: 125 })).toBe("cretaceous");
		// 60–250 Ma: the middle, 155 Ma, is Jurassic.
		expect(pinPeriod({ minMa: 60, maxMa: 250 })).toBe("jurassic");
	});

	it("has no period without both ends", () => {
		expect(pinPeriod({ minMa: 100 })).toBeUndefined();
		expect(pinPeriod(undefined)).toBeUndefined();
	});
});
