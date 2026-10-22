import { describe, expect, it } from "vitest";
import { parseMineralFeatures } from "./minerals.server";

/** As SGB's ocorrencias/MapServer/0/query answers with f=json. */
const feature = (
	id: number,
	x: number,
	y: number,
	attributes: Record<string, unknown> = {},
) => ({
	attributes: {
		ID_OCORRENCIA: id,
		TOPONIMIA: `Ocorrência ${id}`,
		MUNICIPIO: "Nova Lima",
		UF: "MG",
		SUBSTANCIAS: "Ouro",
		STATUS_ECONOMICO: "Mina",
		IMPORTANCIA: "Depósito",
		SITUACAO_MINA: "Ativo(a)",
		SITUACAO_GARIMPO: "Ativo(a)",
		CLASSES_UTILITARIAS: "Metais nobres",
		ROCHAS_HOSPEDEIRAS: "Formação ferrífera bandada",
		PROVINCIA: "São Francisco",
		...attributes,
	},
	geometry: { x, y },
});

const tap: [number, number] = [-43.9, -19.95];

describe("parseMineralFeatures", () => {
	it("maps SGB's fields, nearest first, distances rounded to 10 m", () => {
		const { items, total } = parseMineralFeatures(
			{
				features: [feature(2, -43.91, -19.95), feature(1, -43.9001, -19.95)],
			},
			tap,
		);
		expect(total).toBe(2);
		expect(items.map((i) => i.id)).toEqual([1, 2]);
		expect(items[0]).toMatchObject({
			name: "Ocorrência 1",
			substances: "Ouro",
			status: "Mina",
			activity: "Ativo(a)",
			useClass: "Metais nobres",
			province: "São Francisco",
			distanceM: 10,
		});
	});

	it("keeps the mine or garimpo situation only for its own status", () => {
		const [item] = parseMineralFeatures(
			{
				features: [
					feature(1, -43.9, -19.95, { STATUS_ECONOMICO: "Não explotado" }),
				],
			},
			tap,
		).items;
		expect(item?.activity).toBeUndefined();
	});

	it("drops placeholder host rocks and skips bad records", () => {
		const { items } = parseMineralFeatures(
			{
				features: [
					feature(1, -43.9, -19.95, { ROCHAS_HOSPEDEIRAS: "Não identificada" }),
					{ attributes: { ID_OCORRENCIA: "x" }, geometry: null },
				],
			},
			tap,
		);
		expect(items).toHaveLength(1);
		expect(items[0]?.hostRocks).toBeUndefined();
	});

	it("returns at most five", () => {
		const features = Array.from({ length: 8 }, (_, i) =>
			feature(i, -43.9 - i * 0.001, -19.95),
		);
		const { items, total } = parseMineralFeatures({ features }, tap);
		expect(items).toHaveLength(5);
		expect(total).toBe(8);
	});
});
