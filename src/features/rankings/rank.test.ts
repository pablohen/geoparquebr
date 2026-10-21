import { describe, expect, it } from "vitest";
import { rankBy } from "./rank";
import type { ScoredGeosite } from "./schemas";

const row = (name: string, scientific: number, tourism = 0): ScoredGeosite => ({
	slug: name.toLowerCase(),
	name,
	municipality: "Crato",
	state: "CE",
	scores: { scientific, tourism, didactic: 0, vulnerability: 0 },
});

describe("rankBy", () => {
	const rows = [
		row("Beta", 300),
		row("Alfa", 300),
		row("Gama", 380),
		row("Delta", 100),
	];

	it("orders by the chosen score, then by name", () => {
		expect(rankBy(rows, "scientific", 10).map((r) => r.name)).toEqual([
			"Gama",
			"Alfa",
			"Beta",
			"Delta",
		]);
	});

	it("gives ties the same rank and skips the places they take", () => {
		expect(rankBy(rows, "scientific", 10).map((r) => r.rank)).toEqual([
			1, 2, 2, 4,
		]);
	});

	it("ranks by another score when asked", () => {
		const ranked = rankBy([row("A", 1, 50), row("B", 2, 90)], "tourism", 10);
		expect(ranked[0]?.name).toBe("B");
	});

	it("keeps only the top `limit`", () => {
		expect(rankBy(rows, "scientific", 2)).toHaveLength(2);
	});
});
