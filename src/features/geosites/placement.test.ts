import { describe, expect, it } from "vitest";
import ibge from "./brazil-places.json";
import {
	type BrazilPlaces,
	inMultiPolygon,
	isPlaceholderPoint,
	kmToEdge,
	placeGeosite,
} from "./placement";

/** A 1°×1° state with one municipality. */
const square: BrazilPlaces = {
	edition: 2025,
	states: {
		XX: [
			[
				[
					[-41, -11],
					[-40, -11],
					[-40, -10],
					[-41, -10],
					[-41, -11],
				],
			],
		],
	},
	municipalities: { XX: { "sao joao": [-40.5, -10.5] } },
};

describe("isPlaceholderPoint", () => {
	it("spots whole degrees, as reprojected by GEOSSIT", () => {
		expect(isPlaceholderPoint([-47.99999999999994, -14.999999999999943])).toBe(
			true,
		);
		expect(isPlaceholderPoint([0, 0])).toBe(true);
		expect(isPlaceholderPoint([-48, -15.5])).toBe(false);
	});
});

describe("inMultiPolygon and kmToEdge", () => {
	const shape = square.states.XX ?? [];
	it("tells inside from outside", () => {
		expect(inMultiPolygon(shape, [-40.5, -10.5])).toBe(true);
		expect(inMultiPolygon(shape, [-39.5, -10.5])).toBe(false);
	});
	it("measures to the nearest edge in km", () => {
		// 0.1° of longitude at 10.5° S is about 10.9 km.
		expect(kmToEdge(shape, [-39.9, -10.5])).toBeCloseTo(10.9, 0);
	});
});

describe("placeGeosite", () => {
	it("keeps a point inside its state", () => {
		expect(placeGeosite([-40.3, -10.2], "XX", "São João", square)).toEqual({
			status: "ok",
			point: [-40.3, -10.2],
		});
	});

	it("keeps a point just over the line", () => {
		expect(placeGeosite([-39.97, -10.5], "XX", "São João", square).status).toBe(
			"ok",
		);
	});

	it("moves a point far outside its state to the municipality centre", () => {
		expect(placeGeosite([-35, -10.5], "XX", "Sao Joao", square)).toEqual({
			status: "approximate",
			point: [-40.5, -10.5],
			reason: "outside-state",
		});
	});

	it("moves placeholders even inside the state", () => {
		expect(placeGeosite([-40, -10], "XX", "São João", square)).toMatchObject({
			status: "approximate",
			reason: "placeholder",
		});
	});

	it("can't place a misplaced point in an unknown municipality", () => {
		expect(placeGeosite([0, 0], "XX", "Nowhere", square).status).toBe(
			"unplaceable",
		);
	});

	it("trusts states it has no outline for", () => {
		expect(placeGeosite([-35, -10.5], "YY", "X", square).status).toBe("ok");
	});
});

describe("placeGeosite with IBGE's outlines", () => {
	const places = ibge as unknown as BrazilPlaces;
	const place = (
		point: [number, number],
		state: string,
		municipality: string,
	) => placeGeosite(point, state, municipality, places);

	// Regression: GEOSSIT records that put geosites in the ocean or off by
	// hundreds of km (October 2026).
	it("moves the known GEOSSIT errors", () => {
		const agulhas = place([-41.42769, -36.69888], "RJ", "Resende");
		expect(agulhas).toMatchObject({ status: "approximate" });
		// Resende's centre, near the real peak.
		expect(agulhas.status !== "unplaceable" && agulhas.point[1]).toBeCloseTo(
			-22.4,
			0,
		);
		expect(place([0, 0], "PE", "Cabo de Santo Agostinho").status).toBe(
			"approximate",
		);
		expect(place([-48, -15], "GO", "Pirenopolis").status).toBe("approximate");
		expect(place([-47.436, -14.226], "BA", "Santana").status).toBe(
			"approximate",
		);
	});

	it("keeps reefs off the coast and sites on a state-line river", () => {
		expect(place([-38.92679, -13.94074], "BA", "Marau").status).toBe("ok");
		expect(place([-48.57278, -24.69167], "SP", "Barra do Turvo").status).toBe(
			"ok",
		);
	});

	it("has every municipality", () => {
		const count = Object.values(places.municipalities).reduce(
			(n, towns) => n + Object.keys(towns).length,
			0,
		);
		expect(Object.keys(places.states)).toHaveLength(27);
		expect(count).toBeGreaterThan(5_560);
	});
});
