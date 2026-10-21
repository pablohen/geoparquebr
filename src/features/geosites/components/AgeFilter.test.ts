import { describe, expect, it } from "vitest";
import { GEOLOGIC_PERIODS } from "~/features/geology/time-scale";
import { boundaryPercent, thumbValueTexts, trackImage } from "./AgeFilter";

const N = GEOLOGIC_PERIODS.length;

// The thumbs sit on period boundaries, so the left one touches the start of
// the oldest selected period's colour and the right one the end of the
// youngest's (earlier they sat in the middle of a band).
describe("age slider track", () => {
	it("puts boundaries at equal steps from 0 to 100%", () => {
		expect(boundaryPercent(0)).toBe(0);
		expect(boundaryPercent(N)).toBe(100);
		expect(boundaryPercent(1)).toBeCloseTo(100 / N);
	});

	it("dims nothing when every period is selected", () => {
		expect(trackImage([0, N])).not.toContain("color-mix");
	});

	it("leaves exactly the selected bands undimmed, edge to edge with the thumbs", () => {
		// Jurassic and Cretaceous: boundaries 11 and 13.
		const image = trackImage([11, 13]);
		expect(image).toContain(
			`transparent ${boundaryPercent(11)}% ${boundaryPercent(13)}%`,
		);
		// Each colour band spans boundary i to i+1.
		expect(image).toContain(
			`${GEOLOGIC_PERIODS[N - 12]?.color} ${boundaryPercent(11)}% ${boundaryPercent(12)}%`,
		);
	});
});

// Screen readers announced the thumbs as bare boundary numbers ("3").
describe("age slider thumb texts", () => {
	it("names the period and age at each thumb", () => {
		// Jurassic and Cretaceous selected.
		const [from, to] = thumbValueTexts([N - 5, N - 3]);
		expect(from).toContain("Jurássico");
		expect(from).toContain("201,4");
		expect(to).toContain("Cretáceo");
		expect(to).toContain("66");
	});

	it("reads the right end as today", () => {
		const [, to] = thumbValueTexts([0, N]);
		expect(to).toContain("hoje");
		expect(to).toContain("Quaternário");
	});
});
