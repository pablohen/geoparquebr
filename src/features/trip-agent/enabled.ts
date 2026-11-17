/**
 * The trip planner shows in dev, and in a build only with
 * `VITE_TRIP_AGENT=1`: production needs an access policy for /eve/v1/*
 * (agent/channels/eve.ts) before it may take public traffic.
 */
export const tripAgentEnabled =
	import.meta.env.DEV || import.meta.env.VITE_TRIP_AGENT === "1";
