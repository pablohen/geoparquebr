import { describe, expect, it } from "vitest";
import {
	type ProtectedAreasData,
	protectedAreasAt,
	titleCase,
	toProtectedArea,
} from "./protected-areas";
import cnuc from "./protected-areas.json";

const square = (w: number, s: number, e: number, n: number) => [
	[
		[
			[w, s],
			[e, s],
			[e, n],
			[w, n],
			[w, s],
		] as [number, number][],
	],
];

const data: ProtectedAreasData = {
	edition: "test",
	areas: [
		{
			id: "1",
			name: "Área de Proteção Ambiental Grande",
			category: "Área de Proteção Ambiental",
			sphere: "Estadual",
			group: "Uso Sustentável",
			bbox: [-41, -11, -39, -9],
			shape: square(-41, -11, -39, -9),
		},
		{
			id: "2",
			name: "Parque Nacional Pequeno",
			category: "Parque",
			sphere: "Federal",
			group: "Proteção Integral",
			bbox: [-40.2, -10.2, -39.8, -9.8],
			shape: square(-40.2, -10.2, -39.8, -9.8),
		},
	],
};

describe("titleCase", () => {
	it("capitalises words but not Portuguese particles", () => {
		expect(titleCase("PARQUE NACIONAL DO ITATIAIA")).toBe(
			"Parque Nacional do Itatiaia",
		);
		expect(
			titleCase("ÁREA DE PROTEÇÃO AMBIENTAL DA BACIA DO RIO SÃO BARTOLOMEU"),
		).toBe("Área de Proteção Ambiental da Bacia do Rio São Bartolomeu");
	});
});

describe("toProtectedArea", () => {
	it("keeps active areas and skips the rest", () => {
		const base = {
			cd_cnuc: "0000.00.0004",
			nome_uc: "PARQUE NACIONAL X",
			categoria: "Parque",
			esfera: "Federal",
			grupo: "Proteção Integral",
			situacao: "Ativo",
		};
		expect(toProtectedArea(base)).toEqual({
			id: "0000.00.0004",
			name: "Parque Nacional X",
			category: "Parque",
			sphere: "Federal",
			group: "Proteção Integral",
		});
		expect(toProtectedArea({ ...base, situacao: "Inativo" })).toBeNull();
		expect(toProtectedArea({ ...base, nome_uc: null })).toBeNull();
	});
});

describe("protectedAreasAt", () => {
	it("lists the areas containing a point, strict protection first", () => {
		expect(protectedAreasAt([-40, -10], data).map((a) => a.id)).toEqual([
			"2",
			"1",
		]);
		expect(protectedAreasAt([-40.5, -10.5], data).map((a) => a.id)).toEqual([
			"1",
		]);
		expect(protectedAreasAt([-30, -10], data)).toEqual([]);
	});

	it("finds Itatiaia National Park around Agulhas Negras in CNUC's data", () => {
		const names = protectedAreasAt(
			[-44.67, -22.385],
			cnuc as unknown as ProtectedAreasData,
		).map((a) => a.name);
		expect(names).toContain("Parque Nacional de Itatiaia");
	});
});
