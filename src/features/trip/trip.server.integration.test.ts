/** Runs against a real MongoDB (needs MONGODB_URI, e.g. `docker compose up -d`). */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { geositesCollection } from "~/features/geosites/geosites.server";
import { closeDb, getDb } from "~/lib/db.server";
import { testDbName } from "~/lib/test-db";
import { findItineraries } from "./trip.server";

const enabled = Boolean(process.env.MONGODB_URI);

const exact: [number, number] = [-38.2345678, -6.7654321];
const geosite = (slug: string, tourism: number, extra = {}) => ({
	slug,
	name: slug,
	summary: "",
	municipality: "Sousa",
	state: "PB",
	categories: [],
	relevance: "national",
	scores: { scientific: 1, tourism, didactic: 1, vulnerability: 1 },
	location: { type: "Point", coordinates: exact },
	locationIsSensitive: true,
	...extra,
});

describe.skipIf(!enabled)("trip.server itineraries (MongoDB)", () => {
	beforeAll(async () => {
		process.env.MONGODB_DB = testDbName();
		await (await geositesCollection()).insertMany([
			geosite("a", 300),
			geosite("b", 200, {
				location: { type: "Point", coordinates: [-38.3, -6.8] },
			}),
			geosite("ce", 390, { state: "CE" }),
		] as never[]);
	});

	afterAll(async () => {
		await (await getDb()).dropDatabase();
		await closeDb();
	});

	it("suggests a day in a state, with rounded points for protected sites", async () => {
		const { oneDay } = await findItineraries({ uf: "PB" });
		expect(oneDay.map((s) => s.slug).sort()).toEqual(["a", "b"]);
		const a = oneDay.find((s) => s.slug === "a");
		expect(a?.approximate).toBe(true);
		expect(a?.point).not.toEqual(exact);
		expect(JSON.stringify(oneDay)).not.toContain("2345678");
	});
});
