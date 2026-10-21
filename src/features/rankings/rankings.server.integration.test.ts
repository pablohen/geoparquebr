/** Runs against a real MongoDB (needs MONGODB_URI, e.g. `docker compose up -d`). */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { geositesCollection } from "~/features/geosites/geosites.server";
import { closeDb, getDb } from "~/lib/db.server";
import { findRankings } from "./rankings.server";

const enabled = Boolean(process.env.MONGODB_URI);

const geosite = (slug: string, scientific: number, extra = {}) => ({
	slug,
	name: slug.toUpperCase(),
	summary: "",
	municipality: "Nova Olinda",
	state: "CE",
	categories: [],
	relevance: "national",
	scores: { scientific, tourism: 100, didactic: 100, vulnerability: 100 },
	location: { type: "Point", coordinates: [-39.7, -7.1] },
	locationIsSensitive: true,
	...extra,
});

describe.skipIf(!enabled)("rankings.server (MongoDB)", () => {
	beforeAll(async () => {
		process.env.MONGODB_DB = `geoparquebr_test_${Date.now()}`;
		await (await geositesCollection()).insertMany([
			geosite("pedra", 300, { geoparkId: "araripe" }),
			geosite("lajedo", 350, { state: "RN" }),
			{ ...geosite("unscored", 0), scores: undefined },
		] as never[]);
	});

	afterAll(async () => {
		await (await getDb()).dropDatabase();
		await closeDb();
	});

	it("ranks scored geosites without coordinates", async () => {
		const r = await findRankings({ by: "scientific" });
		expect(r.items.map((g) => g.slug)).toEqual(["lajedo", "pedra"]);
		expect(r.states).toEqual(["CE", "RN"]);
		expect(JSON.stringify(r)).not.toContain("coordinates");
	});

	it("filters by geopark and state", async () => {
		expect(
			(await findRankings({ by: "scientific", gp: "araripe" })).total,
		).toBe(1);
		expect(
			(await findRankings({ by: "scientific", uf: "RN" })).items[0]?.slug,
		).toBe("lajedo");
	});
});
