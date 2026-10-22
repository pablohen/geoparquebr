/** Runs against a real MongoDB (needs MONGODB_URI, e.g. `docker compose up -d`). */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { geositesCollection } from "~/features/geosites/geosites.server";
import { closeDb, getDb } from "~/lib/db.server";
import { testDbName } from "~/lib/test-db";
import { loadGeositeStats, loadTimeline } from "./stats.server";

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

describe.skipIf(!enabled)("stats.server (MongoDB)", () => {
	beforeAll(async () => {
		process.env.MONGODB_DB = testDbName();
		await (await geositesCollection()).insertMany([
			geosite("pedra", {
				geoparkId: "araripe",
				geologicAge: { period: "Cretáceo", minMa: 100, maxMa: 125 },
			}),
			geosite("lajedo", { state: "RN", locationIsSensitive: true }),
		] as never[]);
	});

	afterAll(async () => {
		await (await getDb()).dropDatabase();
		await closeDb();
	});

	it("counts geosites, geoparks and periods", async () => {
		const stats = await loadGeositeStats();
		expect(stats.total).toBe(2);
		expect(stats.dated).toBe(1);
		expect(stats.geoparks.find((g) => g.id === "araripe")?.total).toBe(1);
		expect(stats.periods.find((p) => p.key === "cretaceous")?.count).toBe(1);
	});

	it("groups geosites by period without coordinates", async () => {
		const t = await loadTimeline();
		const cretaceous = t.periods.find((p) => p.id === "cretaceous");
		expect(cretaceous?.geosites).toEqual([
			{
				slug: "pedra",
				name: "PEDRA",
				municipality: "Nova Olinda",
				state: "CE",
			},
		]);
		expect(t.undated).toBe(1);
		expect(JSON.stringify(t)).not.toContain("coordinates");
	});
});
