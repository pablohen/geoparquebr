/** Runs against a real MongoDB (needs MONGODB_URI, e.g. `docker compose up -d`). */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { geositesCollection } from "~/features/geosites/geosites.server";
import { closeDb, getDb } from "~/lib/db.server";
import { testDbName } from "~/lib/test-db";
import { findStatePage } from "./states.server";

const enabled = Boolean(process.env.MONGODB_URI);

const geosite = (slug: string, extra: Record<string, unknown> = {}) => ({
	slug,
	name: slug.toUpperCase(),
	summary: "",
	municipality: "Sousa",
	state: "PB",
	categories: ["paleontological"],
	relevance: "national",
	scores: { scientific: 300, tourism: 100, didactic: 100, vulnerability: 100 },
	// Exact point; the public one is rounded, as the sync stores it.
	location: { type: "Point", coordinates: [-38.2345678, -6.7654321] },
	publicLocation: { type: "Point", coordinates: [-38.23, -6.77] },
	locationIsSensitive: true,
	...extra,
});

describe.skipIf(!enabled)("states.server (MongoDB)", () => {
	beforeAll(async () => {
		process.env.MONGODB_DB = testDbName();
		await (await geositesCollection()).insertMany([
			geosite("passagem", {
				scores: { scientific: 350, tourism: 1, didactic: 1, vulnerability: 1 },
			}),
			geosite("lajedo", { municipality: "Cabaceiras", geoparkId: "serido" }),
			geosite("elsewhere", { state: "CE" }),
		] as never[]);
	});

	afterAll(async () => {
		await (await getDb()).dropDatabase();
		await closeDb();
	});

	it("collects a state's geosites, top scores and geoparks", async () => {
		const page = await findStatePage("PB");
		expect(page?.tally.total).toBe(2);
		expect(page?.geosites.map((g) => g.slug)).toEqual(["lajedo", "passagem"]);
		expect(page?.top[0]?.slug).toBe("passagem");
		expect(page?.geoparks).toEqual(["serido"]);
	});

	it("frames the map on public points and never returns exact ones", async () => {
		const page = await findStatePage("PB");
		const json = JSON.stringify(page);
		expect(json).not.toContain("2345678");
		expect(json).not.toContain("coordinates");
		const [w, , e] = page?.bbox ?? [];
		expect(w).toBeCloseTo(-38.53);
		expect(e).toBeCloseTo(-37.93);
	});

	it("has no page for a state without geosites", async () => {
		expect(await findStatePage("AC")).toBeNull();
	});
});
