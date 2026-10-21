import { describe, expect, it } from "vitest";
import type { StatsRow } from "./schemas";
import { geositeStats, periodsOf, tally, timeline } from "./stats";

const row = (over: Partial<StatsRow>): StatsRow => ({
	slug: "a",
	name: "A",
	municipality: "Crato",
	state: "CE",
	categories: ["paleontological"],
	relevance: "national",
	...over,
});

describe("periodsOf", () => {
	it("lists every period a range overlaps, youngest first", () => {
		expect(periodsOf({ minMa: 100, maxMa: 210 })).toEqual([
			"cretaceous",
			"jurassic",
			"triassic",
		]);
	});

	it("ignores periods a range only touches", () => {
		// The Cretaceous ends at 66 Ma, where the Paleogene starts.
		expect(periodsOf({ minMa: 66, maxMa: 100 })).toEqual(["cretaceous"]);
	});

	it("puts anything older than the Archean's base in the Archean", () => {
		expect(periodsOf({ minMa: 4_100, maxMa: 4_200 })).toEqual(["archean"]);
	});

	it("needs both ends of the range", () => {
		expect(periodsOf({ minMa: 100 })).toEqual([]);
		expect(periodsOf({})).toEqual([]);
	});
});

describe("tally", () => {
	const rows = [
		row({ slug: "a", state: "CE", minMa: 100, maxMa: 120 }),
		row({
			slug: "b",
			state: "RN",
			categories: ["geomorphological", "paleontological"],
			relevance: "international",
		}),
		row({ slug: "c", state: "CE", categories: [] }),
	];
	const t = tally(rows);

	it("counts states and categories, most first", () => {
		expect(t.total).toBe(3);
		expect(t.states).toEqual([
			{ key: "CE", count: 2 },
			{ key: "RN", count: 1 },
		]);
		expect(t.categories).toEqual([
			{ key: "paleontological", count: 2 },
			{ key: "geomorphological", count: 1 },
		]);
	});

	it("keeps relevance in its own order, with zeros", () => {
		expect(t.relevance).toEqual([
			{ key: "international", count: 1 },
			{ key: "national", count: 2 },
			{ key: "geodiversity", count: 0 },
		]);
	});

	it("counts dated geosites per period", () => {
		expect(t.dated).toBe(1);
		expect(t.periods).toHaveLength(16);
		expect(t.periods.find((p) => p.key === "cretaceous")?.count).toBe(1);
		expect(t.periods.reduce((n, p) => n + p.count, 0)).toBe(1);
	});
});

describe("geositeStats", () => {
	it("tallies each geopark and counts its fossil genera", () => {
		const stats = geositeStats(
			[row({ geoparkId: "araripe" }), row({ slug: "b" })],
			[{ geoparks: ["araripe"] }, { geoparks: ["araripe", "serido"] }],
		);
		expect(stats.total).toBe(2);
		expect(stats.genera).toBe(2);
		const araripe = stats.geoparks.find((g) => g.id === "araripe");
		expect(araripe?.total).toBe(1);
		expect(araripe?.genera).toBe(2);
		expect(stats.geoparks.find((g) => g.id === "uberaba")).toMatchObject({
			total: 0,
			genera: 0,
		});
	});
});

describe("timeline", () => {
	it("lists each period's geosites by name, in every period they span", () => {
		const t = timeline([
			row({ slug: "z", name: "Zeta", minMa: 140, maxMa: 150 }),
			row({ slug: "a", name: "Alfa", minMa: 100, maxMa: 110 }),
			row({ slug: "u", name: "Undated" }),
		]);
		expect(t.total).toBe(3);
		expect(t.undated).toBe(1);
		const slugs = (id: string) =>
			t.periods.find((p) => p.id === id)?.geosites.map((g) => g.slug);
		expect(slugs("cretaceous")).toEqual(["a", "z"]);
		expect(slugs("jurassic")).toEqual(["z"]);
		expect(t.periods[0]?.id).toBe("quaternary");
	});
});
