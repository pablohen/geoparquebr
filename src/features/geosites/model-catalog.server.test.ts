import { describe, expect, it } from "vitest";
import { MODEL_CATALOG, modelsFor } from "./model-catalog.server";

const FISH = "d8f10872f8f54154892076ec241e71f0";
const AMMONITE = "eec51ca568334bdcb454778439f4bfb8";
const STALAGMITE = "5948db8fa1b740b589ee748c8e99e611";
const none = () => false;
const all = () => true;

describe("MODEL_CATALOG", () => {
	it("uses well-formed, unique Sketchfab uids", () => {
		const uids = MODEL_CATALOG.map((e) => e.sketchfabUid);
		expect(new Set(uids).size).toBe(uids.length);
		for (const uid of uids) expect(uid).toMatch(/^[0-9a-f]{32}$/);
	});

	it("attaches every entry to something", () => {
		for (const { attachTo } of MODEL_CATALOG)
			expect(
				(attachTo.geossitIds?.length ?? 0) + (attachTo.categories?.length ?? 0),
			).toBeGreaterThan(0);
	});
});

describe("modelsFor", () => {
	it("attaches by GEOSSIT id", () => {
		const models = modelsFor({ source: { id: 1915 }, categories: [] }, none);
		expect(models.map((m) => m.title)).toEqual([
			"Peixe fóssil da Bacia do Araripe (acervo IGc-USP)",
		]);
	});

	it("attaches by category", () => {
		const models = modelsFor({ categories: ["speleological"] }, none);
		expect(models).toHaveLength(1);
		expect(models[0]).toMatchObject({ provider: "sketchfab", uid: STALAGMITE });
	});

	it("returns nothing for unrelated geosites", () => {
		expect(
			modelsFor({ source: { id: 1 }, categories: ["tectonic"] }, none),
		).toEqual([]);
	});

	it("embeds from Sketchfab until a CC BY model is downloaded", () => {
		const [model] = modelsFor({ source: { id: 1915 }, categories: [] }, none);
		expect(model).toMatchObject({ provider: "sketchfab", uid: FISH });
	});

	it("self-hosts downloaded CC BY models", () => {
		const [model] = modelsFor({ source: { id: 1915 }, categories: [] }, all);
		expect(model).toMatchObject({
			provider: "gltf",
			format: "glb",
			url: `/models/${FISH}.glb`,
			upAxis: "y",
		});
	});

	it("never self-hosts view-only models, even if a file exists", () => {
		const [model] = modelsFor({ source: { id: 1920 }, categories: [] }, all);
		expect(model).toMatchObject({ provider: "sketchfab", uid: AMMONITE });
	});

	it("credits the source and states provenance", () => {
		const [model] = modelsFor({ source: { id: 1915 }, categories: [] }, none);
		expect(model).toMatchObject({
			provenance: "region",
			license: "CC-BY-4.0",
			sourceUrl: `https://sketchfab.com/3d-models/${FISH}`,
		});
		expect(model?.attribution).toContain("IGc-USP");
	});

	it("orders specific provenance before illustrative examples", () => {
		const models = modelsFor(
			{ source: { id: 1915 }, categories: ["speleological"] },
			none,
		);
		expect(models.map((m) => m.provenance)).toEqual(["region", "illustrative"]);
	});
});
