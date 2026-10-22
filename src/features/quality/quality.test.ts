import { describe, expect, it } from "vitest";
import { issuesOf, type QualityInput, qualityReport } from "./quality";

const geosite = (over: Partial<QualityInput> = {}): QualityInput => ({
	slug: "a",
	name: "A",
	municipality: "Crato",
	state: "CE",
	summary: "Um resumo.",
	categories: ["paleontological"],
	scores: { scientific: 1, tourism: 1, didactic: 1, vulnerability: 1 },
	coverImageUrl: "https://example.org/a.jpg",
	sourceUrl: "https://www.sgb.gov.br/geossit/geossitios/ver/1",
	...over,
});

describe("issuesOf", () => {
	it("finds nothing in a complete record with a working photo", () => {
		expect(issuesOf(geosite(), "ok")).toEqual([]);
	});

	it("lists every issue, in the page's order", () => {
		expect(
			issuesOf(
				geosite({
					locationIssue: "outside-state",
					scores: undefined,
					summary: " ",
					categories: [],
				}),
				"dead",
			),
		).toEqual([
			"outside-state",
			"photo-dead",
			"no-scores",
			"no-summary",
			"no-theme",
		]);
	});

	it("tells a missing photo from a dead one, and ignores unknown ones", () => {
		expect(issuesOf(geosite({ coverImageUrl: undefined }), undefined)).toEqual([
			"photo-missing",
		]);
		expect(issuesOf(geosite(), "unknown")).toEqual([]);
	});
});

describe("qualityReport", () => {
	it("counts issues, lists affected geosites by name, and unchecked photos", () => {
		const report = qualityReport(
			[
				geosite({ slug: "z", name: "Zeta", locationIssue: "placeholder" }),
				geosite({
					slug: "b",
					name: "Beta",
					coverImageUrl: "https://example.org/b.jpg",
				}),
				geosite({
					slug: "ok",
					name: "Alfa",
					coverImageUrl: "https://example.org/ok.jpg",
				}),
				geosite({
					slug: "u",
					name: "Ômega",
					coverImageUrl: "https://example.org/u.jpg",
				}),
			],
			new Map([
				["https://example.org/a.jpg", "ok"],
				["https://example.org/b.jpg", "dead"],
				["https://example.org/ok.jpg", "ok"],
				["https://example.org/u.jpg", "unknown"],
			]),
			new Date("2026-10-22T12:00:00Z"),
		);
		expect(report.total).toBe(4);
		expect(report.rows.map((r) => r.slug)).toEqual(["b", "z"]);
		expect(report.counts.placeholder).toBe(1);
		expect(report.counts["photo-dead"]).toBe(1);
		expect(report.counts["no-theme"]).toBe(0);
		expect(report.photosUnchecked).toBe(1);
		expect(JSON.stringify(report)).not.toContain("coordinates");
	});
});
