import { describe, expect, it } from "vitest";
import { formatAgeRange, icsColorForAge, midAge, shade } from "./time-scale";

describe("icsColorForAge", () => {
	it.each([
		[1, "#F9F97F"], // Quaternary
		[66, "#FD9A52"], // K–Pg boundary belongs to the Paleogene's lower bound
		[123, "#7FC64E"], // Cretaceous (Santana Group mid-age)
		[588, "#FEB342"], // Neoproterozoic (Ediacaran)
		[3_050, "#F0047F"], // Archean
	])("%d Ma → %s", (ma, color) => {
		expect(icsColorForAge(ma)).toBe(color);
	});

	it("uses grey when the age is unknown or out of range", () => {
		expect(icsColorForAge(undefined)).toBe("#9e9e9e");
		expect(icsColorForAge(5_000)).toBe("#9e9e9e");
	});
});

describe("midAge", () => {
	it("averages both bounds, or falls back to whichever exists", () => {
		expect(midAge(101, 145)).toBe(123);
		expect(midAge(undefined, 145)).toBe(145);
		expect(midAge(101, undefined)).toBe(101);
		expect(midAge()).toBeUndefined();
	});
});

describe("shade", () => {
	it("darkens each channel proportionally", () => {
		expect(shade("#ffffff", 0.5)).toBe("#808080");
		expect(shade("#7FC64E", 0)).toBe("#7fc64e");
	});
});

describe("formatAgeRange", () => {
	it("formats ranges and single ages", () => {
		expect(formatAgeRange(101, 145)).toBe("101–145 Ma");
		expect(formatAgeRange(66, 66)).toBe("66 Ma");
		expect(formatAgeRange(undefined, 2_500)).toBe("2500 Ma");
		expect(formatAgeRange()).toBeUndefined();
	});
});
