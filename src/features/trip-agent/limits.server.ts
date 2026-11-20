/**
 * Daily message limits for the public trip planner, so one visitor can't use
 * up Gemini's free quota for everyone. Counts live in MongoDB and expire with
 * a TTL index.
 *
 * Privacy: a visitor is a salted hash of their IP and the day, so the same
 * person can't be followed from one day to the next, and no IP is stored.
 */
import { createHash } from "node:crypto";
import { dayKey } from "~/features/daily/daily";
import { getDb } from "~/lib/db.server";

/** Messages one visitor may send per day (São Paulo time). */
const VISITOR_DEFAULT = 20;
/** Messages everyone together may send per day; each makes several model calls. */
const DAILY_DEFAULT = 200;

export type LimitConfig = { visitor: number; daily: number };

/** Positive whole numbers from the environment, else the defaults. Pure. */
export function limitConfig(
	env: Record<string, string | undefined>,
): LimitConfig {
	const read = (value: string | undefined, fallback: number) => {
		const n = Number(value);
		return Number.isInteger(n) && n > 0 ? n : fallback;
	};
	return {
		visitor: read(env.TRIP_AGENT_VISITOR_LIMIT, VISITOR_DEFAULT),
		daily: read(env.TRIP_AGENT_DAILY_LIMIT, DAILY_DEFAULT),
	};
}

/**
 * The caller's IP. On Vercel `x-forwarded-for` is set by the edge, its first
 * entry being the client; null when there is none (local calls). Pure.
 */
export function clientIp(headers: Headers): string | null {
	const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
	return forwarded || headers.get("x-real-ip")?.trim() || null;
}

/** `/eve/v1/session` (create) or `/eve/v1/session/<id>` (send). Pure. */
export function isSendPath(method: string, pathname: string): boolean {
	return method === "POST" && /\/session(\/[^/]+)?$/.test(pathname);
}

/**
 * Whether a request to the agent sends a message, the only thing counted:
 * streams, cancels and a bodyless session create (prewarm) are free. Reads a
 * clone, so the body is left for eve.
 */
export async function carriesMessage(request: Request): Promise<boolean> {
	if (!isSendPath(request.method, new URL(request.url).pathname)) return false;
	try {
		const body: unknown = JSON.parse(await request.clone().text());
		return typeof body === "object" && body !== null && "message" in body;
	} catch {
		return false;
	}
}

/** Today's opaque id for an IP: changes daily, unreadable without the salt. Pure. */
export function visitorId(ip: string, day: string, salt: string): string {
	return createHash("sha256")
		.update(`${salt}:${day}:${ip}`)
		.digest("hex")
		.slice(0, 32);
}

type UsageDoc = { _id: string; count: number; expiresAt: Date };

let indexReady: Promise<unknown> | undefined;

async function usageCollection() {
	const col = (await getDb()).collection<UsageDoc>("agent_usage");
	indexReady ??= col
		.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "ttl" })
		.catch((err) => {
			indexReady = undefined;
			throw err;
		});
	await indexReady;
	return col;
}

/** Adds one to a counter and returns the new count. */
async function bump(id: string, expiresAt: Date): Promise<number> {
	const doc = await (await usageCollection()).findOneAndUpdate(
		{ _id: id },
		{ $inc: { count: 1 }, $setOnInsert: { expiresAt } },
		{ upsert: true, returnDocument: "after" },
	);
	return doc?.count ?? 1;
}

export type LimitResult =
	| { ok: true }
	| { ok: false; reason: "visitor" | "daily" };

/**
 * Counts one message from `ip` and says whether it is within today's limits.
 * Over-limit attempts still count, which is harmless: the limit resets daily.
 */
export async function takeMessage(
	ip: string | null,
	now = new Date(),
	config = limitConfig(process.env),
): Promise<LimitResult> {
	const day = dayKey(now);
	// Kept a little past the day so a late write can't outlive its TTL early.
	const expiresAt = new Date(now.getTime() + 36 * 60 * 60 * 1_000);
	const salt = process.env.TRIP_AGENT_SALT ?? "geoparquebr-trip-agent";
	const visitor = visitorId(ip ?? "unknown", day, salt);
	if ((await bump(`visitor:${day}:${visitor}`, expiresAt)) > config.visitor)
		return { ok: false, reason: "visitor" };
	if ((await bump(`daily:${day}`, expiresAt)) > config.daily)
		return { ok: false, reason: "daily" };
	return { ok: true };
}
