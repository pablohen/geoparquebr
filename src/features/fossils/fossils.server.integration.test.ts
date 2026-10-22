/**
 * Runs against a real MongoDB (needs MONGODB_URI, e.g. `docker compose up -d`).
 * Upstream lookups are pre-seeded in `api_cache`, so no network is used.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { geositesCollection } from "~/features/geosites/geosites.server";
import { closeDb, getDb } from "~/lib/db.server";
import { testDbName } from "~/lib/test-db";
import {
	buildFossilIndex,
	findFossilGenus,
	fossilGeneraCollection,
	fossilSitesCollection,
	generaNearGeopark,
	generaNearGeosites,
	listFossilGenera,
	refreshFossilIndexSlice,
	searchFossilGenera,
} from "./fossils.server";

const enabled = Boolean(process.env.MONGODB_URI);

const geosite = (slug: string, extra: Record<string, unknown> = {}) => ({
	slug,
	name: slug.toUpperCase(),
	summary: "",
	municipality: "Nova Olinda",
	state: "CE",
	categories: ["paleontological"],
	relevance: "national",
	location: { type: "Point", coordinates: [-39.7, -7.1] },
	locationIsSensitive: false,
	...extra,
});

const occurrence = (id: string, taxa: string[]) => ({
	source: "sgb",
	id,
	taxa,
	unit: "Formação Santana",
	age: null, // as the Mongo cache returns a missing field
	distanceM: 100,
});

const dastilbe = {
	genus: "Dastilbe",
	genusKey: 4839123,
	species: "Dastilbe elongatus",
	kingdom: "Animalia",
	phylum: "Chordata",
	order: "Gonorynchiformes",
};

async function seedCache(entries: Record<string, unknown>) {
	const expiresAt = new Date(Date.now() + 60_000);
	const col = (await getDb()).collection<{ _id: string }>("api_cache");
	for (const [key, value] of Object.entries(entries))
		await col.updateOne(
			{ _id: key },
			{ $set: { value, expiresAt } },
			{ upsert: true },
		);
}

describe.skipIf(!enabled)("fossils.server (MongoDB)", () => {
	beforeAll(async () => {
		process.env.MONGODB_DB = testDbName();
		await (await geositesCollection()).insertMany([
			geosite("pedra", { geoparkId: "araripe" }),
			geosite("lajedo"),
		] as never[]);
		await seedCache({
			"fossils:sgb:v3:pedra": {
				items: [
					occurrence("1", [
						"dastilbe elongatus santos, 1947",
						"Restos vegetais",
					]),
					// One occurrence naming the genus twice counts once.
					occurrence("2", ["Dastilbe sp.", "Dastilbe elongatus"]),
				],
				total: 2,
			},
			"fossils:gbif:v1:pedra": { items: [], total: 0 },
			"fossils:sgb:v3:lajedo": { items: [], total: 0 },
			"fossils:gbif:v1:lajedo": {
				items: [
					{ ...occurrence("9", ["Dastilbe Jordan, 1910"]), source: "gbif" },
				],
				total: 1,
			},
			"gbif-match:v1:dastilbe elongatus": dastilbe,
			"gbif-match:v1:dastilbe": { ...dastilbe, species: null },
			"gbif-match:v1:restos vegetais": null,
		});
	});

	afterAll(async () => {
		vi.unstubAllGlobals();
		await (await getDb()).dropDatabase();
		await closeDb();
	});

	it("rebuilds nothing until enough geosites have records", async () => {
		// A deadline already past refreshes nothing.
		const report = await refreshFossilIndexSlice({ budgetMs: -1 });
		expect(report).toMatchObject({ refreshed: 0, missing: 2 });
		expect(report.rebuild).toMatch(/only 0% of geosites/);
		expect(await (await fossilGeneraCollection()).countDocuments()).toBe(0);
	});

	it("builds one entry per genus from the cached lookups", async () => {
		const report = await buildFossilIndex();
		expect(report).toMatchObject({
			geosites: 2,
			refreshed: 2,
			failed: 0,
			missing: 0,
			genera: 1,
			coverage: 1,
		});
		const pedra = await (await fossilSitesCollection()).findOne({
			_id: "pedra",
		});
		expect(pedra?.unmatchedNames).toEqual(["Restos vegetais"]);

		const genus = await findFossilGenus("dastilbe");
		expect(genus).toMatchObject({
			name: "Dastilbe",
			gbifKey: 4839123,
			species: ["Dastilbe elongatus"],
			units: ["Formação Santana"],
			ages: [],
			records: { sgb: 2, gbif: 1 },
		});
		expect(
			genus?.geosites.map((g) => [g.slug, g.records, g.geoparkId]),
		).toEqual([
			["pedra", 2, "araripe"],
			["lajedo", 1, undefined],
		]);
		// No coordinates are stored or returned.
		expect(JSON.stringify(genus)).not.toContain("coordinates");
	});

	it("lists genera and finds them by geosite and geopark", async () => {
		expect(await listFossilGenera()).toEqual([
			expect.objectContaining({
				slug: "dastilbe",
				geositeCount: 2,
				speciesCount: 1,
				geoparks: ["araripe"],
			}),
		]);
		expect(await generaNearGeosites(["lajedo"])).toEqual([
			{ slug: "dastilbe", name: "Dastilbe" },
		]);
		expect(await generaNearGeosites(["nowhere"])).toEqual([]);
		expect(await generaNearGeopark("araripe")).toHaveLength(1);
		expect(await generaNearGeopark("serido")).toEqual([]);
	});

	it("finds genera by the start of the genus or a species word", async () => {
		const hit = {
			slug: "dastilbe",
			name: "Dastilbe",
			group: "Chordata",
			geositeCount: 2,
		};
		expect(await searchFossilGenera("dast")).toEqual([hit]);
		expect(await searchFossilGenera("ELONG")).toEqual([hit]);
		expect(await searchFossilGenera("stilbe")).toEqual([]);
		// Regex characters are taken literally.
		expect(await searchFossilGenera("d.*")).toEqual([]);
	});

	it("refreshes the stalest geosites first, a slice at a time", async () => {
		const sites = await fossilSitesCollection();
		await sites.updateOne(
			{ _id: "lajedo" },
			{ $set: { refreshedAt: new Date(0) } },
		);
		const before = (await sites.findOne({ _id: "pedra" }))?.refreshedAt;
		const report = await refreshFossilIndexSlice({ budgetMs: 10_000 });
		expect(report).toMatchObject({ refreshed: 2, failed: 0 });
		expect(typeof report.rebuild).toBe("object");
		expect(
			(await sites.findOne({ _id: "lajedo" }))?.refreshedAt.getTime(),
		).toBeGreaterThan(0);
		expect(
			(await sites.findOne({ _id: "pedra" }))?.refreshedAt.getTime(),
		).toBeGreaterThanOrEqual(before?.getTime() ?? 0);
	});

	it("keeps previous records and pages when the upstream lookups fail", async () => {
		await (await getDb())
			.collection("api_cache")
			.deleteMany({ _id: /^fossils:/ });
		vi.stubGlobal("fetch", () => Promise.reject(new TypeError("offline")));
		await expect(buildFossilIndex()).rejects.toThrow(/left unchanged/);
		const slice = await refreshFossilIndexSlice({ budgetMs: 10_000 });
		expect(slice).toMatchObject({ refreshed: 0, failed: 2, missing: 0 });
		// The rebuild still runs on the stored records.
		expect(slice.rebuild).toMatchObject({ genera: 1, deleted: 0 });
		expect(await (await fossilSitesCollection()).countDocuments()).toBe(2);
		expect(await findFossilGenus("dastilbe")).not.toBeNull();
	});
});
