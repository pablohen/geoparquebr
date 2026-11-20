/**
 * Recognizes the planner's daily-limit refusal (`agent/channels/eve.ts`) in
 * an error from eve's client, so the chat can explain it. Isomorphic, pure.
 */
export const LIMIT_CODE = "trip_agent_limit";

export type LimitReason = "visitor" | "daily";

/** "visitor" or "daily" for a limit refusal; null for any other error. */
export function limitReason(error: unknown): LimitReason | null {
	if (typeof error !== "object" || error === null) return null;
	const { code, body } = error as { code?: unknown; body?: unknown };
	if (code !== LIMIT_CODE) return null;
	const text = typeof body === "string" ? body : "";
	return text.includes(`${LIMIT_CODE}:daily`) ? "daily" : "visitor";
}
