/** Runs against a real MongoDB (needs MONGODB_URI); throwaway database. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "~/lib/db.server";
import { changesCollection, listChanges, recordChanges } from "./news.server";

const enabled = Boolean(process.env.MONGODB_URI);
const none = { added: [], changed: [], removed: [] };

describe.skipIf(!enabled)("news.server (MongoDB)", () => {
	beforeAll(() => {
		process.env.MONGODB_DB = `geoparquebr_test_${Date.now()}`;
	});

	afterAll(async () => {
		await (await getDb()).dropDatabase();
		await closeDb();
	});

	it("stores only syncs that changed something, newest first", async () => {
		expect(await recordChanges(none)).toBe(false);
		await recordChanges(
			{ ...none, added: [{ slug: "pedra-cariri", name: "Pedra Cariri" }] },
			new Date("2026-10-12T06:00:00Z"),
		);
		await recordChanges(
			{ ...none, removed: [{ name: "Gone" }] },
			new Date("2026-10-19T06:00:00Z"),
		);
		const runs = await listChanges();
		expect(runs.map((r) => r.at)).toEqual([
			"2026-10-19T06:00:00.000Z",
			"2026-10-12T06:00:00.000Z",
		]);
		expect(runs[1]?.added).toEqual([
			{ slug: "pedra-cariri", name: "Pedra Cariri" },
		]);
		expect(runs[0]?.id).toMatch(/^[0-9a-f]{24}$/);
	});

	it("keeps about a year of runs", async () => {
		for (let i = 0; i < 55; i++)
			await recordChanges(
				{ ...none, removed: [{ name: `R${i}` }] },
				new Date(Date.UTC(2027, 0, 1 + i)),
			);
		expect(await (await changesCollection()).countDocuments()).toBe(52);
		expect((await listChanges(1))[0]?.removed).toEqual([{ name: "R54" }]);
	});
});
