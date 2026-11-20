/**
 * The trip planner shows in dev, and in a build only with
 * `VITE_TRIP_AGENT=1`: a launch switch for the button. The agent's routes
 * are public either way, guarded by the daily limits in agent/channels/eve.ts.
 */
export const tripAgentEnabled =
	import.meta.env.DEV || import.meta.env.VITE_TRIP_AGENT === "1";
