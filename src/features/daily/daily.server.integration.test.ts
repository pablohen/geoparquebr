/** Runs against a real MongoDB (needs MONGODB_URI, e.g. `docker compose up -d`). */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { geositesCollection } from "~/features/geosites/geosites.server";
import { closeDb, getDb } from "~/lib/db.server";
import { testDbName } from "~/lib/test-db";
import { findGeositeOfTheDay } from "./daily.server";

const enabled = Boolean(process.env.MONGODB_URI);

const geosite = (slug: string, extra: Record<string, unknown> = {}) => ({
	slug,
	name: slug.toUpperCase(),
	summary: "Um resumo.",
	municipality: "Crato",
	state: "CE",
	categories: [],
	relevance: "national",
	location: { type: "Point", coordinates: [-39.4123456, -7.2345678] },
	locationIsSensitive: true,
	...extra,
});

describe.skipIf(!enabled)("daily.server (MongoDB)", () => {
	beforeAll(async () => {
		process.env.MONGODB_DB = testDbName();
		await (await geositesCollection()).insertMany([
			geosite("com-foto", { coverImageUrl: "https://example.org/a.jpg" }),
			geosite("sem-foto-1"),
			geosite("sem-foto-2"),
		] as never[]);
	});

	afterAll(async () => {
		await (await getDb()).dropDatabase();
		await closeDb();
	});

	it("features a geosite with a photo, the same all day", async () => {
		const morning = await findGeositeOfTheDay(new Date("2026-10-22T10:00:00Z"));
		const evening = await findGeositeOfTheDay(new Date("2026-10-22T23:00:00Z"));
		expect(morning?.slug).toBe("com-foto");
		expect(morning).toEqual(evening);
		expect(morning?.day).toBe("2026-10-22");
		expect(JSON.stringify(morning)).not.toContain("coordinates");
	});
});
