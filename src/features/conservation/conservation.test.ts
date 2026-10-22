import { describe, expect, it } from "vitest";
import { conservation } from "./conservation";

const row = (
	slug: string,
	degradationRisk?: "low" | "medium" | "high",
	vulnerability?: number,
) => ({
	slug,
	name: slug,
	municipality: "X",
	state: "BA",
	locationIsSensitive: false,
	degradationRisk,
	vulnerability,
});

describe("conservation", () => {
	const c = conservation([
		row("a", "high", 200),
		row("b", "high", 350),
		row("c", "low"),
		row("d", "high"),
		row("e"),
	]);

	it("counts each risk, low to high", () => {
		expect(c.risks).toEqual([
			{ key: "low", count: 1 },
			{ key: "medium", count: 0 },
			{ key: "high", count: 3 },
		]);
		expect(c.total).toBe(5);
	});

	it("lists high-risk geosites, most vulnerable first, unscored last", () => {
		expect(c.high.map((g) => g.slug)).toEqual(["b", "a", "d"]);
		expect(c.high[0]).not.toHaveProperty("degradationRisk");
	});
});
