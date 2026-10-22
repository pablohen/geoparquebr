import { describe, expect, it, vi } from "vitest";
import { fetchTileWithRetry } from "./fetch-retry";

const ok = (bytes = 3) => new Response(new Uint8Array(bytes));
const status = (code: number) => new Response(null, { status: code });

// Regression: SGB's tile server answers some requests of a burst with a 500
// or an empty 200, and those tiles stayed blank.
describe("fetchTileWithRetry", () => {
	const opts = (fetchImpl: typeof fetch) => ({ fetchImpl, backoffMs: 0 });

	it("retries 5xx and empty bodies, then returns the tile", async () => {
		const fetchImpl = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(status(500))
			.mockResolvedValueOnce(ok(0))
			.mockResolvedValueOnce(ok(5));
		const body = await fetchTileWithRetry(
			"u",
			new AbortController().signal,
			opts(fetchImpl),
		);
		expect(body.byteLength).toBe(5);
		expect(fetchImpl).toHaveBeenCalledTimes(3);
	});

	it("gives up after the last try", async () => {
		const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(status(503));
		await expect(
			fetchTileWithRetry("u", new AbortController().signal, opts(fetchImpl)),
		).rejects.toThrow("503");
		expect(fetchImpl).toHaveBeenCalledTimes(3);
	});

	it("doesn't retry a 4xx or an aborted request", async () => {
		const notFound = vi.fn<typeof fetch>().mockResolvedValue(status(404));
		await expect(
			fetchTileWithRetry("u", new AbortController().signal, opts(notFound)),
		).rejects.toThrow("404");
		expect(notFound).toHaveBeenCalledTimes(1);

		const controller = new AbortController();
		controller.abort();
		const never = vi.fn<typeof fetch>();
		await expect(
			fetchTileWithRetry("u", controller.signal, opts(never)),
		).rejects.toBeDefined();
		expect(never).not.toHaveBeenCalled();
	});
});
