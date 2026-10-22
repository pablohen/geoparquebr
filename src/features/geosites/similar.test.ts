import { describe, expect, it } from "vitest";
import { type SimilarCandidate, similarTo } from "./similar";

const site = (
	slug: string,
	state: string,
	categories: SimilarCandidate["categories"],
	age?: [number, number],
): SimilarCandidate => ({
	slug,
	name: slug,
	municipality: "X",
	state,
	categories,
	minMa: age?.[0],
	maxMa: age?.[1],
});

const target = site(
	"santana",
	"CE",
	["paleontological", "stratigraphic"],
	[100, 120],
);

describe("similarTo", () => {
	it("ranks shared themes above shared periods", () => {
		const out = similarTo(target, [
			site("one-theme-same-age", "PB", ["paleontological"], [110, 115]),
			site(
				"two-themes",
				"PE",
				["paleontological", "stratigraphic"],
				[300, 310],
			),
		]);
		expect(out.map((s) => s.slug)).toEqual([
			"two-themes",
			"one-theme-same-age",
		]);
	});

	it("says what it shares", () => {
		const [match] = similarTo(target, [
			site("crato", "PI", ["paleontological", "speleological"], [100, 110]),
		]);
		expect(match?.categories).toEqual(["paleontological"]);
		expect(match?.periods).toEqual(["cretaceous"]);
	});

	it("needs a shared theme, and skips itself and its own state", () => {
		expect(
			similarTo(target, [
				target,
				site("same-state", "CE", ["paleontological"]),
				site("only-age", "BA", ["tectonic"], [100, 120]),
			]),
		).toEqual([]);
	});

	it("keeps the top few", () => {
		const many = Array.from({ length: 9 }, (_, i) =>
			site(`s${i}`, "BA", ["paleontological"]),
		);
		expect(similarTo(target, many)).toHaveLength(5);
	});
});
