import { describe, expect, it } from "vitest";
import { dayKey, pickOfTheDay } from "./daily";

const slugs = Array.from({ length: 50 }, (_, i) => `geosite-${i}`);

describe("dayKey", () => {
	it("uses the date in São Paulo, not UTC", () => {
		// 01:30 UTC on the 22nd is still the 21st in Brazil (UTC−3).
		expect(dayKey(new Date("2026-10-22T01:30:00Z"))).toBe("2026-10-21");
		expect(dayKey(new Date("2026-10-22T04:00:00Z"))).toBe("2026-10-22");
	});
});

describe("pickOfTheDay", () => {
	it("picks the same geosite all day, whatever the list order", () => {
		const a = pickOfTheDay(slugs, "2026-10-22");
		expect(pickOfTheDay([...slugs].reverse(), "2026-10-22")).toBe(a);
	});

	it("varies from day to day", () => {
		const week = Array.from({ length: 7 }, (_, i) =>
			pickOfTheDay(slugs, `2026-10-${String(20 + i).padStart(2, "0")}`),
		);
		expect(new Set(week).size).toBeGreaterThan(4);
	});

	it("has nothing to pick from an empty list", () => {
		expect(pickOfTheDay([], "2026-10-22")).toBeUndefined();
	});
});
