import { describe, expect, it } from "vitest";
import { ItinerariesInputSchema, SearchGeositesInputSchema } from "./schemas";
import { buildProposal, toAgentGeosite, trimText } from "./trip-agent.server";

const doc = {
	slug: "pedra-cariri",
	name: "Pedra Cariri",
	municipality: "Nova Olinda",
	state: "CE",
	geoparkId: "araripe" as const,
	categories: ["paleontological" as const],
	relevance: "international" as const,
	scores: { scientific: 300, tourism: 250, didactic: 200, vulnerability: 100 },
	locationIsApproximate: false,
	locationIsSensitive: false,
};

const stopDoc = (slug: string, extra: Record<string, unknown> = {}) => ({
	slug,
	name: slug,
	municipality: "Sousa",
	state: "PB",
	location: {
		type: "Point" as const,
		coordinates: [-38.2345678, -6.7654321] as [number, number],
	},
	locationIsSensitive: false,
	locationIsApproximate: false,
	...extra,
});

describe("toAgentGeosite", () => {
	it("keeps the marks and flags the model needs, and no location", () => {
		const g = toAgentGeosite(doc);
		expect(g).toMatchObject({
			slug: "pedra-cariri",
			tourism: 250,
			didactic: 200,
		});
		expect(g).not.toHaveProperty("location");
		expect(g).not.toHaveProperty("vulnerability");
	});

	it("leaves marks out when GEOSSIT has none", () => {
		const { scores: _, ...unscored } = doc;
		expect(toAgentGeosite(unscored)).not.toHaveProperty("tourism");
	});
});

describe("trimText", () => {
	it("keeps short text as is", () => {
		expect(trimText("Curto.", 100)).toBe("Curto.");
	});

	it("cuts at a sentence end when there is one late enough", () => {
		const text = `${"a".repeat(70)}. ${"b".repeat(50)}`;
		expect(trimText(text, 100)).toBe(`${"a".repeat(70)}.…`);
	});

	it("otherwise cuts at a word", () => {
		expect(trimText("um dois três quatro", 10)).toBe("um dois…");
	});
});

describe("buildProposal", () => {
	it("keeps the visitor's order and drops repeats", () => {
		const p = buildProposal(["b", "a", "b"], [stopDoc("a"), stopDoc("b")], {
			title: "T",
		});
		expect(p.stops.map((s) => s.slug)).toEqual(["b", "a"]);
		expect(p.skipped).toEqual([]);
	});

	it("skips unknown slugs and municipality-centre points", () => {
		const p = buildProposal(
			["a", "centre", "nope"],
			[stopDoc("a"), stopDoc("centre", { locationIsApproximate: true })],
			{ title: "T" },
		);
		expect(p.stops.map((s) => s.slug)).toEqual(["a"]);
		expect(p.skipped).toEqual(["centre", "nope"]);
	});

	it("never returns a sensitive site's exact point", () => {
		const p = buildProposal(
			["cave"],
			[stopDoc("cave", { locationIsSensitive: true })],
			{
				title: "T",
			},
		);
		expect(p.stops[0]?.approximate).toBe(true);
		expect(JSON.stringify(p)).not.toContain("2345678");
	});

	it("measures the straight-line length in whole km", () => {
		const p = buildProposal(
			["a", "b"],
			[
				stopDoc("a", { location: { type: "Point", coordinates: [-38, -6] } }),
				stopDoc("b", { location: { type: "Point", coordinates: [-38, -7] } }),
			],
			{ title: "T" },
		);
		expect(p.totalKm).toBe(111);
	});
});

describe("tool input schemas", () => {
	it("itineraries take exactly one of geopark or state", () => {
		expect(ItinerariesInputSchema.safeParse({ gp: "araripe" }).success).toBe(
			true,
		);
		expect(ItinerariesInputSchema.safeParse({ uf: "CE" }).success).toBe(true);
		expect(ItinerariesInputSchema.safeParse({}).success).toBe(false);
		expect(
			ItinerariesInputSchema.safeParse({ gp: "araripe", uf: "CE" }).success,
		).toBe(false);
	});

	it("search defaults to 15 results and caps them at 30", () => {
		expect(SearchGeositesInputSchema.parse({}).limit).toBe(15);
		expect(SearchGeositesInputSchema.safeParse({ limit: 31 }).success).toBe(
			false,
		);
	});
});
