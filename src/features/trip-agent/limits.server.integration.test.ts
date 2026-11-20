/** Runs against a real MongoDB (needs MONGODB_URI, e.g. `docker compose up -d`). */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "~/lib/db.server";
import { testDbName } from "~/lib/test-db";
import { takeMessage } from "./limits.server";

const enabled = Boolean(process.env.MONGODB_URI);

describe.skipIf(!enabled)("trip planner limits (MongoDB)", () => {
	beforeAll(() => {
		process.env.MONGODB_DB = testDbName();
	});

	afterAll(async () => {
		await (await getDb()).dropDatabase();
		await closeDb();
	});

	it("allows a visitor up to their limit, then refuses", async () => {
		const now = new Date("2026-11-20T15:00:00Z");
		const config = { visitor: 2, daily: 100 };
		expect(await takeMessage("203.0.113.1", now, config)).toEqual({ ok: true });
		expect(await takeMessage("203.0.113.1", now, config)).toEqual({ ok: true });
		expect(await takeMessage("203.0.113.1", now, config)).toEqual({
			ok: false,
			reason: "visitor",
		});
		// Someone else isn't affected.
		expect(await takeMessage("203.0.113.2", now, config)).toEqual({ ok: true });
	});

	it("caps everyone together per day", async () => {
		const now = new Date("2026-11-21T15:00:00Z");
		const config = { visitor: 10, daily: 2 };
		expect(await takeMessage("198.51.100.1", now, config)).toEqual({
			ok: true,
		});
		expect(await takeMessage("198.51.100.2", now, config)).toEqual({
			ok: true,
		});
		expect(await takeMessage("198.51.100.3", now, config)).toEqual({
			ok: false,
			reason: "daily",
		});
	});

	it("starts over the next day (São Paulo time)", async () => {
		const config = { visitor: 1, daily: 100 };
		const ip = "192.0.2.9";
		// 23:30 in São Paulo on the 22nd, then 00:30 on the 23rd.
		expect(
			await takeMessage(ip, new Date("2026-11-23T02:30:00Z"), config),
		).toEqual({ ok: true });
		expect(
			await takeMessage(ip, new Date("2026-11-23T03:30:00Z"), config),
		).toEqual({ ok: true });
	});

	it("stores no IP addresses", async () => {
		const docs = await (await getDb())
			.collection("agent_usage")
			.find()
			.toArray();
		expect(JSON.stringify(docs)).not.toMatch(/\d+\.\d+\.\d+\.\d+/);
	});
});
