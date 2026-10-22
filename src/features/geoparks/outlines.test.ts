import { describe, expect, it } from "vitest";
import { GEOPARK_MUNICIPALITIES } from "./geoparks";
import { foldName, isMunicipality, simplifyRing } from "./outlines";

describe("isMunicipality", () => {
	it("matches the folded name exactly, not a prefix", () => {
		expect(isMunicipality("RS:cacapava do sul", "Caçapava do Sul")).toBe(true);
		expect(isMunicipality("RS:cacapava", "Caçapava do Sul")).toBe(false);
	});

	it("uses keys written the way foldName writes names", () => {
		for (const keys of Object.values(GEOPARK_MUNICIPALITIES))
			for (const key of keys) {
				const name = key.slice(3);
				expect(foldName(name)).toBe(name);
			}
	});
});

describe("simplifyRing", () => {
	// A square with a nearly straight extra point on each side.
	const square: [number, number][] = [
		[0, 0],
		[0.5, 0.0001],
		[1, 0],
		[1, 1],
		[0, 1],
		[0, 0],
	];

	it("drops points that barely bend the line, keeping the corners", () => {
		expect(simplifyRing(square, 0.001)).toEqual([
			[0, 0],
			[1, 0],
			[1, 1],
			[0, 1],
			[0, 0],
		]);
	});

	it("keeps real bends and the ring closed", () => {
		const out = simplifyRing(square, 0.00001);
		expect(out).toContainEqual([0.5, 0.0001]);
		expect(out[0]).toEqual(out.at(-1));
	});
});
