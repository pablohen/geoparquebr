/** Runs against a real MongoDB (needs MONGODB_URI, e.g. `docker compose up -d`). */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { geositesCollection } from "~/features/geosites/geosites.server";
import { closeDb, getDb } from "~/lib/db.server";
import { testDbName } from "~/lib/test-db";
import { findUnit, listUnits } from "./units.server";

const enabled = Boolean(process.env.MONGODB_URI);

const geosite = (slug: string, formation: string) => ({
	slug,
	name: slug.toUpperCase(),
	summary: "",
	municipality: "Sousa",
	state: "PB",
	categories: [],
	relevance: "national",
	geologicAge: {
		period: "Cretáceo",
		formation,
		minMa: 130,
		maxMa: 140,
		mapScale: 1_000_000,
	},
	location: { type: "Point", coordinates: [-38.2345678, -6.7654321] },
	locationIsSensitive: true,
});

describe.skipIf(!enabled)("units.server (MongoDB)", () => {
	beforeAll(async () => {
		process.env.MONGODB_DB = testDbName();
		await (await geositesCollection()).insertMany([
			geosite("passagem", "Formação Sousa"),
			geosite("contato", "Formação Sousa / Formação Antenor Navarro"),
		] as never[]);
	});

	afterAll(async () => {
		await (await getDb()).dropDatabase();
		await closeDb();
	});

	it("lists units by how many geosites they have", async () => {
		expect(await listUnits()).toEqual([
			{ slug: "formacao-sousa", name: "Formação Sousa", geositeCount: 2 },
			{
				slug: "formacao-antenor-navarro",
				name: "Formação Antenor Navarro",
				geositeCount: 1,
			},
		]);
	});

	it("builds a unit page without coordinates", async () => {
		const unit = await findUnit("formacao-sousa");
		expect(unit?.age).toMatchObject({
			period: "Cretáceo",
			minMa: 130,
			maxMa: 140,
		});
		expect(unit?.geosites.find((g) => g.slug === "contato")?.alongside).toEqual(
			["Formação Antenor Navarro"],
		);
		expect(JSON.stringify(unit)).not.toContain("coordinates");
		expect(await findUnit("no-such-unit")).toBeNull();
	});
});
