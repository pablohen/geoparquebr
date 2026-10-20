import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { cached } from "./cache.server";
import { closeDb, getDb } from "./db.server";

describe.skipIf(!process.env.MONGODB_URI)("cached (MongoDB)", () => {
	beforeAll(() => {
		process.env.MONGODB_DB = `geoparquebr_test_cache_${Date.now()}`;
	});

	afterAll(async () => {
		await (await getDb()).dropDatabase();
		await closeDb();
	});

	it("computes once and serves the stored value afterwards", async () => {
		const compute = vi.fn(async () => ({ n: 42 }));
		expect(await cached("k1", 60_000, compute)).toEqual({ n: 42 });
		expect(await cached("k1", 60_000, compute)).toEqual({ n: 42 });
		expect(compute).toHaveBeenCalledTimes(1);
	});

	it("recomputes after expiry", async () => {
		const compute = vi.fn(async () => Date.now());
		await cached("k2", 1, compute);
		await new Promise((r) => setTimeout(r, 10));
		await cached("k2", 1, compute);
		expect(compute).toHaveBeenCalledTimes(2);
	});

	it("does not cache failures", async () => {
		const failing = vi.fn(async () => {
			throw new Error("upstream down");
		});
		await expect(cached("k3", 60_000, failing)).rejects.toThrow(
			"upstream down",
		);
		expect(await cached("k3", 60_000, async () => "ok")).toBe("ok");
	});
});
