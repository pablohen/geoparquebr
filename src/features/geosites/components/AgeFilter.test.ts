import { describe, expect, it } from "vitest";
import { GEOLOGIC_PERIODS } from "~/features/geology/time-scale";
import { bandEdges, trackImage } from "./AgeFilter";

const LAST = GEOLOGIC_PERIODS.length - 1;

// Regression: bands were 1/16 wide from the left while thumbs sit at i/15,
// so a thumb could sit on the neighbouring period's colour.
describe("bandEdges", () => {
	it("centres each period's band on its thumb", () => {
		for (let i = 1; i < LAST; i++) {
			const [from, to] = bandEdges(i);
			expect((from + to) / 2).toBeCloseTo((i / LAST) * 100);
		}
	});

	it("covers the track with half bands at the ends", () => {
		expect(bandEdges(0)[0]).toBe(0);
		expect(bandEdges(LAST)[1]).toBe(100);
		for (let i = 0; i < LAST; i++)
			expect(bandEdges(i)[1]).toBeCloseTo(bandEdges(i + 1)[0]);
	});
});

describe("trackImage", () => {
	it("dims nothing when every period is selected", () => {
		expect(trackImage([0, LAST])).not.toContain("color-mix");
	});

	it("dims outside the selected periods' bands", () => {
		const [from] = bandEdges(11);
		const [, to] = bandEdges(12);
		const image = trackImage([11, 12]);
		expect(image).toContain(`transparent ${from}% ${to}%`);
		expect(image.indexOf("color-mix")).toBeLessThan(image.indexOf("#"));
	});
});
