/**
 * Small MongoDB-backed cache for slow or rate-limited upstream APIs.
 * Entries expire through a TTL index, so the collection cleans itself up.
 */
import { getDb } from "./db.server";

type CacheDoc = { _id: string; value: unknown; expiresAt: Date };

let indexReady: Promise<unknown> | undefined;

async function cacheCollection() {
	const col = (await getDb()).collection<CacheDoc>("api_cache");
	indexReady ??= col
		.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "ttl" })
		.catch((err) => {
			indexReady = undefined;
			throw err;
		});
	await indexReady;
	return col;
}

/**
 * Returns the cached value for `key`, or computes, stores and returns it.
 * Failures are not cached; callers decide what an upstream outage means.
 */
export async function cached<T>(
	key: string,
	ttlMs: number,
	compute: () => Promise<T>,
): Promise<T> {
	const col = await cacheCollection();
	const hit = await col.findOne({ _id: key, expiresAt: { $gt: new Date() } });
	if (hit) return hit.value as T;

	const value = await compute();
	await col.updateOne(
		{ _id: key },
		{ $set: { value, expiresAt: new Date(Date.now() + ttlMs) } },
		{ upsert: true },
	);
	return value;
}
