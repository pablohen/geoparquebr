/**
 * Runs against a real MongoDB (needs MONGODB_URI, e.g. `docker compose up -d`).
 * Uses a throwaway database per run and drops it afterwards.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GeologicPeriodId } from "~/features/geology/time-scale";
import {
	countGeositesByGeopark,
	findGeoparkGeosites,
} from "~/features/geoparks/geoparks.server";
import { closeDb, getDb } from "~/lib/db.server";
import { bboxCenter, haversineMeters } from "~/lib/geo";
import {
	ensureGeositeIndexes,
	findGeositeBySlug,
	findGeositeLocation,
	findGeositesInBounds,
	findNearbyGeosites,
	findSimilarGeosites,
	geositesCollection,
	publicPoint,
	searchGeosites,
	syncSourcedGeosites,
} from "./geosites.server";
import { GeositeInputSchema } from "./schemas";

const enabled = Boolean(process.env.MONGODB_URI);

function geosite(
	id: number,
	slug: string,
	coordinates: [number, number],
	extra: Record<string, unknown> = {},
) {
	const parsed = GeositeInputSchema.parse({
		slug,
		name: slug,
		summary: "",
		municipality: "Teste",
		state: "CE",
		categories: ["paleontological"],
		relevance: "national",
		location: { type: "Point", coordinates },
		source: { system: "geossit", id, url: `https://example.org/${id}` },
		...extra,
	});
	return {
		...parsed,
		source: parsed.source ?? { system: "geossit" as const, id, url: "" },
	};
}

const sites = [
	geosite(1, "centro", [-39.5, -7.1], {
		name: "Pedreira Central",
		description: "Calcários com pterossauros e peixes fósseis.",
		geologicAge: {
			period: "Cretáceo",
			formation: "Formação Crato",
			minMa: 100.5,
			maxMa: 125,
			mapScale: 1_000_000,
		},
	}),
	geosite(2, "leste", [-38.6, -7.0], {
		categories: ["speleological"],
		relevance: "international",
		geoparkId: "araripe",
		scores: {
			scientific: 300,
			tourism: 250,
			didactic: 200,
			vulnerability: 100,
		},
	}),
	geosite(3, "sensivel", [-39.123456, -7.654321], {
		locationIsSensitive: true,
	}),
	geosite(4, "longe", [-47.9, -15.8]), // Brasília, outside the box
];
const box: [number, number, number, number] = [-40, -8, -38, -6.5];

describe.skipIf(!enabled)("geosites.server (MongoDB)", () => {
	beforeAll(async () => {
		process.env.MONGODB_DB = `geoparquebr_test_${Date.now()}`;
		const col = await geositesCollection();
		await ensureGeositeIndexes(col);
		await syncSourcedGeosites(col, "geossit", sites);
	});

	afterAll(async () => {
		await (await getDb()).dropDatabase();
		await closeDb();
	});

	it("returns only geosites inside the viewport, nearest to the centre first", async () => {
		const result = await findGeositesInBounds({ bbox: box });
		// Expected order from an independent haversine on the public coordinates.
		const centre = bboxCenter(box);
		const expected = sites
			.filter((s) => s.slug !== "longe")
			.map((s) => ({
				slug: s.slug,
				d: haversineMeters(centre, publicPoint(s)),
			}))
			.sort((x, y) => x.d - y.d);
		expect(result.map((g) => g.slug)).toEqual(expected.map((e) => e.slug));
		for (const [i, g] of result.entries())
			expect(g.distanceMeters / 1_000).toBeCloseTo(
				(expected[i]?.d ?? 0) / 1_000,
				0,
			);
	});

	it("applies category, relevance and geopark filters", async () => {
		const byCategory = await findGeositesInBounds({
			bbox: box,
			categories: ["speleological"],
		});
		expect(byCategory.map((g) => g.slug)).toEqual(["leste"]);
		expect(
			(
				await findGeositesInBounds({ bbox: box, relevance: "international" })
			).map((g) => g.slug),
		).toEqual(["leste"]);
		expect(
			(await findGeositesInBounds({ bbox: box, geoparkId: "araripe" })).map(
				(g) => g.slug,
			),
		).toEqual(["leste"]);
	});

	it("returns light summaries without heavy fields", async () => {
		const [first] = await findGeositesInBounds({ bbox: box });
		expect(first).not.toHaveProperty("description");
		expect(first).not.toHaveProperty("models");
		expect(first).not.toHaveProperty("_id");
		expect(typeof first?.id).toBe("string");
	});

	it("rounds sensitive coordinates in summaries and details, but not server-side", async () => {
		const summary = (await findGeositesInBounds({ bbox: box })).find(
			(g) => g.slug === "sensivel",
		);
		expect(summary?.location.coordinates).toEqual([-39.12, -7.65]);
		expect((await findGeositeBySlug("sensivel"))?.location.coordinates).toEqual(
			[-39.12, -7.65],
		);
		expect(await findGeositeLocation("sensivel")).toEqual({
			point: [-39.123456, -7.654321],
			sensitive: true,
		});
	});

	it("covers a Brazil-wide viewport despite geodesic polygon edges", async () => {
		const all = await findGeositesInBounds({ bbox: [-74, -34, -34, 5.5] });
		expect(all.map((g) => g.slug).sort()).toEqual(
			["centro", "leste", "longe", "sensivel"].sort(),
		);
	});

	// Regression: the Portuguese stemmer turned "serido" into "ser" ("to be"),
	// so every description with the verb outranked the Seridó geosites.
	it("doesn't stem queries into unrelated common words", async () => {
		await syncSourcedGeosites(await geositesCollection(), "geossit", [
			...sites,
			geosite(6, "canion-dos-apertados", [-36.5, -6.3], {
				name: "Canion dos Apertados",
				description: "Um dos geossitios do Geoparque Serido.",
			}),
			geosite(7, "caverna-qualquer", [-36.6, -6.4], {
				name: "Caverna Qualquer",
				description: "Atributos da natureza que podem ser vistos aqui.",
			}),
		]);
		expect((await searchGeosites("serido")).map((g) => g.slug)).toEqual([
			"canion-dos-apertados",
		]);
		expect((await searchGeosites("Seridó")).map((g) => g.slug)).toEqual([
			"canion-dos-apertados",
		]);
		// Back to the shared fixture for the tests that follow.
		await syncSourcedGeosites(await geositesCollection(), "geossit", sites);
	});

	it("replaces an existing stemmed text index", async () => {
		const col = await geositesCollection();
		await col.dropIndex("text_search");
		await col.createIndex(
			{ name: "text", municipality: "text", description: "text" },
			{ name: "text_search", default_language: "portuguese" },
		);
		await ensureGeositeIndexes(col);
		const index = (await col.listIndexes().toArray()).find(
			(i) => i.name === "text_search",
		);
		expect(index?.default_language).toBe("none");
	});

	it("searches by whole words and by partial input", async () => {
		expect((await searchGeosites("pterossauro")).map((g) => g.slug)).toEqual([
			"centro",
		]);
		expect((await searchGeosites("ptero")).map((g) => g.slug)).toEqual([
			"centro",
		]);
		expect((await searchGeosites("pedreira")).map((g) => g.slug)).toEqual([
			"centro",
		]);
		expect(await searchGeosites("inexistente")).toEqual([]);
	});

	it("treats regex characters in the query literally", async () => {
		await expect(searchGeosites("(.*")).resolves.toEqual([]);
	});

	it("re-syncs idempotently and prunes records dropped upstream", async () => {
		const col = await geositesCollection();
		const again = await syncSourcedGeosites(col, "geossit", sites);
		expect(again).toMatchObject({ inserted: 0, deleted: 0 });

		const without = sites.filter((s) => s.slug !== "longe");
		const pruned = await syncSourcedGeosites(col, "geossit", without);
		expect(pruned.deleted).toBe(1);
		expect(await findGeositeBySlug("longe")).toBeNull();
	});

	it("unsets optional fields that disappear upstream", async () => {
		const col = await geositesCollection();
		const withoutGeopark = sites
			.filter((s) => s.slug !== "longe")
			.map((s) => (s.slug === "leste" ? { ...s, geoparkId: undefined } : s));
		await syncSourcedGeosites(col, "geossit", withoutGeopark);
		const doc = await col.findOne({ slug: "leste" });
		expect(doc).not.toHaveProperty("geoparkId");
	});

	it("refuses to sync an empty import (would delete everything)", async () => {
		const col = await geositesCollection();
		await expect(syncSourcedGeosites(col, "geossit", [])).rejects.toThrow(
			/refusing/,
		);
	});

	it("finds similar geosites in other states without coordinates", async () => {
		const col = await geositesCollection();
		await col.insertOne({
			...geosite(99, "parecido", [-40.5, -9.4], { state: "PE" }),
			publicLocation: { type: "Point", coordinates: [-40.5, -9.4] },
		} as never);
		try {
			const similar = await findSimilarGeosites("centro");
			expect(similar?.map((g) => g.slug)).toEqual(["parecido"]);
			expect(similar?.[0]?.categories).toEqual(["paleontological"]);
			expect(JSON.stringify(similar)).not.toContain("coordinates");
			expect(await findSimilarGeosites("no-such-slug")).toBeNull();
		} finally {
			await col.deleteOne({ slug: "parecido" });
		}
	});

	it("lists nearby geosites without itself, using public coordinates", async () => {
		const nearby = await findNearbyGeosites("centro");
		const slugs = nearby?.map((g) => g.slug);
		expect(slugs).not.toContain("centro");
		// Brasília is ~1 300 km away, beyond the 300 km cut-off.
		expect(slugs).not.toContain("longe");
		const cave = nearby?.find((g) => g.slug === "sensivel");
		expect(cave?.location.coordinates).toEqual([-39.12, -7.65]);
		expect(cave && cave.distanceMeters % 100).toBe(0);
		expect(await findNearbyGeosites("nao-existe")).toBeNull();
	});

	it("filters by geological age, dropping geosites without one", async () => {
		const slugs = async (age: [GeologicPeriodId, GeologicPeriodId]) =>
			(await findGeositesInBounds({ bbox: box, age })).map((g) => g.slug);
		expect(await slugs(["cretaceous", "cretaceous"])).toEqual(["centro"]);
		expect(await slugs(["quaternary", "jurassic"])).toEqual(["centro"]);
		expect(await slugs(["jurassic", "archean"])).toEqual([]);
	});

	it("filters by a minimum score, dropping geosites without scores", async () => {
		const slugs = async (key: "tourism" | "didactic", min: number) =>
			(await findGeositesInBounds({ bbox: box, minScore: { key, min } })).map(
				(g) => g.slug,
			);
		expect(await slugs("tourism", 250)).toEqual(["leste"]);
		expect(await slugs("didactic", 201)).toEqual([]);
	});

	// Regression: the viewport query used to match and measure on exact
	// coordinates, so tiny boxes or distances from chosen centres located
	// sensitive sites to the metre.
	describe("never reveals a sensitive site's exact location", () => {
		const exact: [number, number] = [-39.123456, -7.654321];
		const rounded: [number, number] = [-39.12, -7.65];

		it("doesn't match a box around the exact point that misses the rounded one", async () => {
			const tiny: [number, number, number, number] = [
				exact[0] - 0.0005,
				exact[1] - 0.0005,
				exact[0] + 0.0005,
				exact[1] + 0.0005,
			];
			expect(await findGeositesInBounds({ bbox: tiny })).toEqual([]);
		});

		it("matches a box around the rounded point instead", async () => {
			const aroundRounded: [number, number, number, number] = [
				rounded[0] - 0.0005,
				rounded[1] - 0.0005,
				rounded[0] + 0.0005,
				rounded[1] + 0.0005,
			];
			const result = await findGeositesInBounds({ bbox: aroundRounded });
			expect(result.map((g) => g.slug)).toEqual(["sensivel"]);
		});

		it("measures distances to the rounded point", async () => {
			const aroundExact: [number, number, number, number] = [
				exact[0] - 0.05,
				exact[1] - 0.05,
				exact[0] + 0.05,
				exact[1] + 0.05,
			];
			const [g] = await findGeositesInBounds({ bbox: aroundExact });
			const centre = bboxCenter(aroundExact);
			expect(g?.slug).toBe("sensivel");
			expect(g?.distanceMeters).toBeCloseTo(
				haversineMeters(centre, rounded),
				-1,
			);
			expect(g?.distanceMeters).toBeGreaterThan(400);
		});

		it("keeps the stored public point out of responses", async () => {
			expect(await findGeositeBySlug("sensivel")).not.toHaveProperty(
				"publicLocation",
			);
			const [summary] = await findGeositesInBounds({ bbox: box });
			expect(summary).not.toHaveProperty("publicLocation");
		});
	});

	it("lists a geopark's geosites with public points, and counts per geopark", async () => {
		await syncSourcedGeosites(await geositesCollection(), "geossit", [
			...sites,
			geosite(5, "caverna-araripe", [-39.4321, -7.2345], {
				geoparkId: "araripe",
				locationIsSensitive: true,
			}),
		]);
		const araripe = await findGeoparkGeosites("araripe");
		expect(araripe.map((g) => g.slug)).toEqual(["caverna-araripe", "leste"]);
		expect(araripe[0]?.location.coordinates).toEqual([-39.43, -7.23]);
		expect(araripe[0]).not.toHaveProperty("publicLocation");
		expect(await findGeoparkGeosites("uberaba")).toEqual([]);
		expect(await countGeositesByGeopark()).toEqual({ araripe: 2 });
	});
});
