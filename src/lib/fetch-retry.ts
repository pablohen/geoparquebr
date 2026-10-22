/**
 * Fetches a tile body, retrying the hiccups some public tile servers have
 * under a map's burst of requests: 5xx, network errors and empty 200s (SGB's
 * geoportal sends those). 4xx and aborts are final.
 */
export async function fetchTileWithRetry(
	url: string,
	signal: AbortSignal,
	{
		tries = 3,
		backoffMs = 400,
		fetchImpl = fetch,
	}: { tries?: number; backoffMs?: number; fetchImpl?: typeof fetch } = {},
): Promise<ArrayBuffer> {
	let last: unknown;
	for (let attempt = 1; attempt <= tries; attempt++) {
		if (signal.aborted) throw signal.reason;
		try {
			const res = await fetchImpl(url, { signal });
			if (res.status >= 400 && res.status < 500)
				throw Object.assign(new Error(`HTTP ${res.status}`), { final: true });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const body = await res.arrayBuffer();
			if (body.byteLength === 0) throw new Error("empty tile");
			return body;
		} catch (err) {
			if (signal.aborted || (err as { final?: boolean }).final) throw err;
			last = err;
			if (attempt < tries)
				await new Promise((r) => setTimeout(r, backoffMs * attempt));
		}
	}
	throw last;
}
