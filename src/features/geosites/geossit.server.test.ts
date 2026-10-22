import { afterEach, describe, expect, it, vi } from "vitest";
import { GEOPARK_MUNICIPALITIES } from "~/features/geoparks/geoparks";
import {
	fetchWithRetries,
	mapGeossitFeatures,
	normalize,
} from "./geossit.server";

/** A raw GEOSSIT GeoJSON feature, as served with f=geojson. */
function feature(
	overrides: Record<string, unknown> = {},
	coordinates = [-39.695, -7.122],
) {
	return {
		type: "Feature",
		geometry: { type: "Point", coordinates },
		properties: {
			id_geossitio: 1997,
			nome: "Pedra Cariri",
			municipio: "Nova Olinda",
			uf: "ce",
			tematica_principal: "Paleontologia",
			enquadramento_geologico: "Bacias Sedimentares Emersas do Fanerozoico",
			provincia_geologica: "Araripe",
			indicativo_de_relevancia: "Geossitio de Relevancia Internacional",
			quantificacao_cientifica__0_400: "355",
			quantificacao_turistica__0_400_: "275",
			quantificacao_didatica__0_400_: "305",
			quantificacao_de_vulnerabilidad: "295",
			risco_de_degradacao: "Medio",
			geoparque__proposta_: "Araripe Geopark UNESCO ",
			resumo: "Lavras de calcário laminado. Fósseis excepcionais.",
			autores: "Fulano",
			ultima_edicao: 1596016495000,
			link_geossit: "https://www.cprm.gov.br/geossit/geossitios/ver/1997 ",
			link_imagem_representativa:
				"http://www.cprm.gov.br/geossit/img/uploads/dado_grafico/thumb/grande/3-3.jpg",
			...overrides,
		},
	};
}

describe("normalize", () => {
	it("strips accents, case and punctuation", () => {
		expect(normalize("  Caçapava do Sul! ")).toBe("cacapava do sul");
		expect(normalize("História da mineração")).toBe("historia da mineracao");
	});
});

describe("mapGeossitFeatures", () => {
	it("maps a complete record", () => {
		const { geosites, skipped } = mapGeossitFeatures([feature()]);
		expect(skipped).toEqual([]);
		expect(geosites).toHaveLength(1);
		expect(geosites[0]).toMatchObject({
			slug: "pedra-cariri",
			name: "Pedra Cariri",
			state: "CE",
			categories: ["paleontological"],
			relevance: "international",
			degradationRisk: "medium",
			scores: {
				scientific: 355,
				tourism: 275,
				didactic: 305,
				vulnerability: 295,
			},
			geology: {
				setting: "Bacias Sedimentares Emersas do Fanerozoico",
				province: "Araripe",
			},
			location: { type: "Point", coordinates: [-39.695, -7.122] },
			geoparkId: "araripe",
			geoparkProposal: undefined,
			source: {
				system: "geossit",
				id: 1997,
				url: "https://www.sgb.gov.br/geossit/geossitios/ver/1997",
				authors: "Fulano",
				updatedAt: "2020-07-29T09:54:55.000Z",
			},
		});
	});

	it("rewrites cprm.gov.br links to https://www.sgb.gov.br", () => {
		const [g] = mapGeossitFeatures([feature()]).geosites;
		expect(g?.coverImageUrl).toBe(
			"https://www.sgb.gov.br/geossit/img/uploads/dado_grafico/thumb/grande/3-3.jpg",
		);
	});

	it("assigns UNESCO geoparks by municipality, ignoring the free-text field", () => {
		const [romualdo] = mapGeossitFeatures([
			feature({
				id_geossitio: 1915,
				nome: "Membro Romualdo",
				municipio: "Santana do Cariri",
				geoparque__proposta_: "Nao",
			}),
		]).geosites;
		expect(romualdo?.geoparkId).toBe("araripe");

		const [cacapava] = mapGeossitFeatures([
			feature({
				municipio: "Caçapava do Sul",
				uf: "RS",
				geoparque__proposta_: "Nao",
			}),
		]).geosites;
		expect(cacapava?.geoparkId).toBe("cacapava");
	});

	// Regression: Morro Grande (SC) was missing, so its geosites fell outside
	// Caminhos dos Cânions do Sul, whose territory has seven municipalities.
	it("counts Morro Grande in Caminhos dos Cânions do Sul", () => {
		const [g] = mapGeossitFeatures([
			feature({
				municipio: "Morro Grande",
				uf: "SC",
				geoparque__proposta_: "Nao",
			}),
		]).geosites;
		expect(g?.geoparkId).toBe("caminhos-dos-canions-do-sul");
		expect(GEOPARK_MUNICIPALITIES["caminhos-dos-canions-do-sul"]).toHaveLength(
			7,
		);
	});

	it("keeps a free-text proposal only outside UNESCO geoparks", () => {
		const [g] = mapGeossitFeatures([
			feature({
				municipio: "Iporanga",
				uf: "SP",
				geoparque__proposta_: "Alto Vale do Ribeira",
			}),
		]).geosites;
		expect(g?.geoparkId).toBeUndefined();
		expect(g?.geoparkProposal).toBe("Alto Vale do Ribeira");
	});

	it("marks caves, fossil sites and high-risk sites as sensitive", () => {
		const { geosites } = mapGeossitFeatures([
			feature({
				id_geossitio: 1,
				nome: "Caverna",
				tematica_principal: "Espeleologia",
			}),
			feature({
				id_geossitio: 2,
				nome: "Fosseis",
				tematica_principal: "Paleontologia",
			}),
			feature({
				id_geossitio: 3,
				nome: "Canion",
				tematica_principal: "Geomorfologia",
				risco_de_degradacao: "Alto",
			}),
			feature({
				id_geossitio: 4,
				nome: "Mirante",
				tematica_principal: "Geomorfologia",
				risco_de_degradacao: "Baixo",
			}),
		]);
		expect(geosites.map((g) => g.locationIsSensitive)).toEqual([
			true,
			true,
			true,
			false,
		]);
	});

	it("maps every GEOSSIT theme and tolerates the '0' placeholder", () => {
		const themes = {
			Plutonismo: "igneous",
			Vulcanismo: "igneous",
			"Historia da mineracao": "historical",
			"Formacões superficiais": "pedological",
			Astroblema: "impact",
		};
		for (const [theme, category] of Object.entries(themes)) {
			const [g] = mapGeossitFeatures([
				feature({ tematica_principal: theme }),
			]).geosites;
			expect(g?.categories).toEqual([category]);
		}
		const [none] = mapGeossitFeatures([
			feature({ tematica_principal: "0" }),
		]).geosites;
		expect(none?.categories).toEqual([]);
	});

	it("appends the GEOSSIT id to names that repeat in the inventory", () => {
		const { geosites } = mapGeossitFeatures([
			feature({ id_geossitio: 1913, nome: "Toca da Janela" }),
			feature({ id_geossitio: 1960, nome: "Toca da Janela" }),
			feature({ id_geossitio: 7, nome: "Outro Sítio" }),
		]);
		expect(geosites.map((g) => g.slug)).toEqual([
			"toca-da-janela-1913",
			"toca-da-janela-1960",
			"outro-sitio",
		]);
	});

	it("summarises long abstracts at a sentence or word boundary", () => {
		const long = `${"Primeira frase com bastante conteúdo geológico. ".repeat(8)}${"palavra ".repeat(100)}`;
		const [g] = mapGeossitFeatures([feature({ resumo: long })]).geosites;
		expect(g?.summary.length).toBeLessThanOrEqual(500);
		expect(g?.summary.endsWith(".") || g?.summary.endsWith("…")).toBe(true);
		expect(g?.description).toBe(long.trim());
	});

	it("drops scores unless all four are present", () => {
		const [g] = mapGeossitFeatures([
			feature({ quantificacao_didatica__0_400_: null }),
		]).geosites;
		expect(g?.scores).toBeUndefined();
	});

	it("skips invalid records individually and reports why", () => {
		const { geosites, skipped } = mapGeossitFeatures([
			feature(),
			feature({ id_geossitio: 2, indicativo_de_relevancia: "Inventado" }),
			{ type: "Feature", geometry: null, properties: { id_geossitio: 3 } },
		]);
		expect(geosites.map((g) => g.source?.id)).toEqual([1997]);
		expect(skipped.map((s) => s.id)).toEqual([3, 2]);
		expect(skipped.every((s) => s.reason.length > 0)).toBe(true);
	});
});

// Regression: a single HTTP 500 from GEOSSIT aborted the whole seed.
describe("fetchWithRetries", () => {
	const url = new URL("https://example.org/query");
	afterEach(() => vi.unstubAllGlobals());

	const respond = (...statuses: (number | Error)[]) => {
		const fetchMock = vi.fn();
		for (const s of statuses)
			if (s instanceof Error) fetchMock.mockRejectedValueOnce(s);
			else fetchMock.mockResolvedValueOnce(new Response("", { status: s }));
		vi.stubGlobal("fetch", fetchMock);
		return fetchMock;
	};

	it("retries server errors and network failures until one succeeds", async () => {
		const fetchMock = respond(500, new Error("ECONNRESET"), 200);
		const res = await fetchWithRetries(url, { pauseMs: 0 });
		expect(res.status).toBe(200);
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it("gives up after the last attempt", async () => {
		respond(502, 503, 500);
		expect((await fetchWithRetries(url, { pauseMs: 0 })).status).toBe(500);
	});

	it("doesn't retry client errors", async () => {
		const fetchMock = respond(400);
		expect((await fetchWithRetries(url, { pauseMs: 0 })).status).toBe(400);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
