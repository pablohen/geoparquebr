/** Runs against a real MongoDB (needs MONGODB_URI, e.g. `docker compose up -d`). */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	ensureGeositeIndexes,
	geositesCollection,
} from "~/features/geosites/geosites.server";
import { closeDb, getDb } from "~/lib/db.server";
import { testDbName } from "~/lib/test-db";
import {
	findAgentGeosite,
	findAgentGeosites,
	proposeTrip,
} from "./trip-agent.server";

const enabled = Boolean(process.env.MONGODB_URI);

const exact: [number, number] = [-39.4567891, -7.1234567];
const geosite = (slug: string, tourism: number, extra = {}) => ({
	slug,
	name: `Geossítio ${slug}`,
	summary: "Resumo",
	description: "Descrição longa. ".repeat(200),
	municipality: "Santana do Cariri",
	state: "CE",
	geoparkId: "araripe",
	categories: ["paleontological"],
	relevance: "national",
	scores: { scientific: 1, tourism, didactic: 1, vulnerability: 1 },
	location: { type: "Point", coordinates: exact },
	publicLocation: { type: "Point", coordinates: exact },
	locationIsSensitive: false,
	createdAt: new Date(),
	updatedAt: new Date(),
	...extra,
});

describe.skipIf(!enabled)("trip-agent.server (MongoDB)", () => {
	beforeAll(async () => {
		process.env.MONGODB_DB = testDbName();
		const col = await geositesCollection();
		await ensureGeositeIndexes(col);
		await col.insertMany([
			geosite("museu", 300),
			geosite("pterossauros", 350),
			geosite("caverna", 200, { locationIsSensitive: true }),
			geosite("sousa", 390, { state: "PB", geoparkId: undefined }),
			geosite("centro", 400, { locationIsApproximate: true }),
		] as never[]);
	});

	afterAll(async () => {
		await (await getDb()).dropDatabase();
		await closeDb();
	});

	it("searches a geopark, best tourism mark first, without coordinates", async () => {
		const found = await findAgentGeosites({ geoparkId: "araripe" });
		expect(found.map((g) => g.slug)).toEqual([
			"centro",
			"pterossauros",
			"museu",
			"caverna",
		]);
		expect(JSON.stringify(found)).not.toContain("4567891");
	});

	it("combines free text with filters", async () => {
		const found = await findAgentGeosites({
			query: "pterossauros",
			state: "CE",
		});
		expect(found.map((g) => g.slug)).toEqual(["pterossauros"]);
	});

	it("reads one geosite with a trimmed description and no location", async () => {
		const g = await findAgentGeosite("museu");
		expect(g?.path).toBe("/geosites/museu");
		expect(g?.description?.length).toBeLessThanOrEqual(1_501);
		expect(JSON.stringify(g)).not.toContain("4567891");
		expect(await findAgentGeosite("nada")).toBeNull();
	});

	it("proposes a trip with public points, skipping approximate ones", async () => {
		const p = await proposeTrip({
			title: "Cariri",
			stops: ["caverna", "centro", "museu"],
		});
		expect(p.stops.map((s) => s.slug)).toEqual(["caverna", "museu"]);
		expect(p.skipped).toEqual(["centro"]);
		const cave = p.stops.find((s) => s.slug === "caverna");
		expect(cave?.point).not.toEqual(exact);
		expect(cave?.approximate).toBe(true);
	});
});
