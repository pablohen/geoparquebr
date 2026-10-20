import { describe, expect, it } from "vitest";
import { parsePhoton } from "./photon.server";

const feature = (
	properties: Record<string, unknown>,
	coordinates = [-41.39, -12.56],
) => ({
	type: "Feature",
	geometry: { type: "Point", coordinates },
	properties,
});

describe("parsePhoton", () => {
	it("maps a place with an extent to a [w, s, e, n] box", () => {
		const [place] = parsePhoton({
			features: [
				feature({
					osm_type: "R",
					osm_id: 123,
					osm_value: "nature_reserve",
					name: "Parque Nacional da Chapada Diamantina",
					state: "Bahia",
					countrycode: "BR",
					// Photon order: [minLon, maxLat, maxLon, minLat]
					extent: [-41.5431242, -12.4532403, -41.135794, -13.315718],
				}),
			],
		});
		expect(place).toEqual({
			id: "R123",
			name: "Parque Nacional da Chapada Diamantina",
			context: "Bahia",
			kind: "nature_reserve",
			point: [-41.39, -12.56],
			bbox: [-41.5431242, -13.315718, -41.135794, -12.4532403],
		});
	});

	it("omits the box when there is no extent", () => {
		const [place] = parsePhoton({
			features: [feature({ name: "Chapada Diamantina", state: "Bahia" })],
		});
		expect(place?.bbox).toBeUndefined();
		expect(place?.id).toBe("photon-0");
	});

	it("combines city and state, without repeating the place's own name", () => {
		const [town, city] = parsePhoton({
			features: [
				feature({ name: "Peró", city: "Cabo Frio", state: "Rio de Janeiro" }),
				feature({ name: "Crato", city: "Crato", state: "Ceará" }),
			],
		});
		expect(town?.context).toBe("Cabo Frio, Rio de Janeiro");
		expect(city?.context).toBe("Ceará");
	});

	it("drops unnamed and non-Brazilian results", () => {
		const places = parsePhoton({
			features: [
				feature({ state: "Bahia" }),
				feature({ name: "Salta", countrycode: "AR" }),
				feature({ name: "Lençóis", countrycode: "BR" }),
			],
		});
		expect(places.map((p) => p.name)).toEqual(["Lençóis"]);
	});

	it("rejects malformed responses", () => {
		expect(() => parsePhoton({ results: [] })).toThrow();
	});
});
