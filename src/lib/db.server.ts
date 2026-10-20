import { type Db, MongoClient } from "mongodb";

/**
 * One MongoClient per server process. Cached on globalThis so Vite HMR
 * doesn't open a new connection pool on every module reload in dev.
 */
const globalForMongo = globalThis as typeof globalThis & {
	__mongoClient?: Promise<MongoClient>;
};

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`Missing required env var ${name}`);
	return value;
}

function connect(): Promise<MongoClient> {
	const client = new MongoClient(requireEnv("MONGODB_URI"), {
		appName: "geoparquebr",
		maxPoolSize: 20,
		// Zod outputs omit absent optionals as `undefined`; don't store them as null.
		ignoreUndefined: true,
	});
	return client.connect();
}

export async function getDb(): Promise<Db> {
	globalForMongo.__mongoClient ??= connect().catch((err) => {
		// Don't cache a failed connection; let the next request retry.
		globalForMongo.__mongoClient = undefined;
		throw err;
	});
	const client = await globalForMongo.__mongoClient;
	return client.db(process.env.MONGODB_DB ?? "geoparquebr");
}
