import { describe, expect, it } from "vitest";
import {
	CONTOUR_THRESHOLDS,
	DENSITY_STOPS,
	FOSSIL_DENSITY_TILES,
} from "./overlays";

describe("overlay sources", () => {
	it("asks GBIF only for fossil specimens in Brazil, binned", () => {
		const url = new URL(FOSSIL_DENSITY_TILES.replace("{z}/{x}/{y}", "1/1/1"));
		expect(url.searchParams.get("basisOfRecord")).toBe("FOSSIL_SPECIMEN");
		expect(url.searchParams.get("country")).toBe("BR");
		expect(url.searchParams.get("bin")).toBe("hex");
	});

	it("keeps minor contours a divisor of major ones", () => {
		for (const [minor, major] of Object.values(CONTOUR_THRESHOLDS))
			expect(major % minor).toBe(0);
	});

	it("grades the density scale from light to dark", () => {
		const lum = (hex: string) => {
			const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) =>
				Number.parseInt(hex.slice(i, i + 2), 16),
			);
			return 0.2126 * r + 0.7152 * g + 0.0722 * b;
		};
		const values = DENSITY_STOPS.map(([, c]) => lum(c));
		expect([...values].sort((a, b) => b - a)).toEqual(values);
	});
});
