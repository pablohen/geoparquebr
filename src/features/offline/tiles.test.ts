import { describe, expect, it } from "vitest";
import { GEOPARKS } from "~/features/geoparks/geoparks";
import { tileUrls } from "./tiles";

const T = "https://t/{z}/{x}/{y}.png";

describe("tileUrls", () => {
	it("covers the whole world with one tile at zoom 0", () => {
		expect(tileUrls(T, [-180, -85, 180, 85], 0, 0)).toEqual([
			"https://t/0/0/0.png",
		]);
	});

	it("finds the known tile for the Itaimbezinho canyon", () => {
		// Same tile the map requested for the canyon at zoom 12.
		expect(tileUrls(T, [-50.085, -29.165, -50.083, -29.163], 12, 12)).toEqual([
			"https://t/12/1478/2395.png",
		]);
	});

	it("grows about four times per zoom level", () => {
		const area = GEOPARKS.araripe.area;
		const z11 = tileUrls(T, [...area], 11, 11).length;
		const z12 = tileUrls(T, [...area], 12, 12).length;
		expect(z12).toBeGreaterThan(z11 * 3);
		expect(z12).toBeLessThan(z11 * 5);
	});

	it("keeps a geopark download to a few hundred tiles", () => {
		for (const { area } of Object.values(GEOPARKS)) {
			const vector = tileUrls(T, [...area], 6, 12).length;
			const relief = tileUrls(T, [...area], 7, 12).length;
			expect(vector + relief).toBeLessThan(600);
		}
	});
});
