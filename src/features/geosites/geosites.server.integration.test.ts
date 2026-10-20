/**
 * Runs against a real MongoDB (needs MONGODB_URI, e.g. `docker compose up -d`).
 * Uses a throwaway database per run and drops it afterwards.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "~/lib/db.server";
import { bboxCenter, haversineMeters } from "~/lib/geo";
import {
	ensureGeositeIndexes,
	findGeositeBySlug,
	findGeositeLocation,
	findGeositesInBounds,
	findNearbyGeosites,
	geositesCollection,
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
	}),
	geosite(2, "leste", [-38.6, -7.0], {
		categories: ["speleological"],
		relevance: "international",
		geoparkId: "araripe",
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
		// Expected order from an independent haversine on the exact coordinates.
		const centre = bboxCenter(box);
		const expected = sites
			.filter((s) => s.slug !== "longe")
			.map((s) => ({
				slug: s.slug,
				d: haversineMeters(centre, s.location.coordinates),
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

	it("searches by whole words (stemmed) and by partial input", async () => {
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
});
