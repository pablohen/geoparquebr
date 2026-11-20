import { type AuthFn, ForbiddenError, localDev, none } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";
import { LIMIT_CODE } from "~/features/trip-agent/limit-error";

/**
 * Counts each message against the daily limits and refuses it with a 403
 * once one is reached; otherwise skips, so the walk goes on to the real
 * auth. An auth entry rather than onMessage, because only auth errors reach
 * the client as their own status (onMessage failures become a plain 500).
 */
const dailyLimits: AuthFn<Request> = async (request) => {
	const { carriesMessage, clientIp, takeMessage } = await import(
		"~/features/trip-agent/limits.server"
	);
	if (!(await carriesMessage(request))) return null;
	const result = await takeMessage(clientIp(request.headers));
	if (!result.ok)
		throw new ForbiddenError({
			code: LIMIT_CODE,
			message: `${LIMIT_CODE}:${result.reason}`,
		});
	return null;
};

// The site has no accounts, so the planner is open to anonymous visitors.
// What keeps it safe to expose: read-only tools over public data, no built-in
// tools (agent.ts), and daily message limits per visitor and overall.
export default eveChannel({
	auth: [dailyLimits, localDev(), none()],
});
