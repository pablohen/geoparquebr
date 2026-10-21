/**
 * Runs against a real MongoDB (needs MONGODB_URI, e.g. `docker compose up -d`).
 * Upstream lookups are pre-seeded in `api_cache`, so no network is used.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { geositesCollection } from "~/features/geosites/geosites.server";
import { closeDb, getDb } from "~/lib/db.server";
import {
	buildFossilIndex,
	findFossilGenus,
	fossilGeneraCollection,
	generaNearGeopark,
	generaNearGeosites,
	listFossilGenera,
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
		process.env.MONGODB_DB = `geoparquebr_test_${Date.now()}`;
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

	it("builds one entry per genus from the cached lookups", async () => {
		const report = await buildFossilIndex();
		expect(report).toMatchObject({
			geosites: 2,
			failedLookups: 0,
			failedMatches: 0,
			genera: 1,
			unmatchedNames: 1,
		});

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
			}),
		]);
		expect(await generaNearGeosites(["lajedo"])).toEqual([
			{ slug: "dastilbe", name: "Dastilbe" },
		]);
		expect(await generaNearGeosites(["nowhere"])).toEqual([]);
		expect(await generaNearGeopark("araripe")).toHaveLength(1);
		expect(await generaNearGeopark("serido")).toEqual([]);
	});

	it("writes nothing when the upstream lookups fail", async () => {
		await (await getDb())
			.collection("api_cache")
			.deleteMany({ _id: /^fossils:/ });
		vi.stubGlobal("fetch", () => Promise.reject(new TypeError("offline")));
		await expect(buildFossilIndex()).rejects.toThrow(/left unchanged/);
		expect(await (await fossilGeneraCollection()).countDocuments()).toBe(1);
	});
});
