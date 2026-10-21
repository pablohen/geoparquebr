import { createFileRoute } from "@tanstack/react-router";

/** Seconds of upstream lookups per run; the function's limit is 60. */
const BUDGET_MS = 35_000;

/**
 * Daily fossil refresh, called by Vercel Cron (schedule in vite.config.ts):
 * the stalest geosites' fossil records for ~35 s, then the genus pages.
 * About 80 geosites a run, so all of them are refreshed every few days.
 */
export const Route = createFileRoute("/api/cron/sync-fossils")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				// Loaded lazily so the Mongo driver stays out of the client graph.
				const { isAuthorizedCron } = await import(
					"~/features/geosites/cron.server"
				);
				if (!isAuthorizedCron(request))
					return new Response("Unauthorized", { status: 401 });
				const { refreshFossilIndexSlice } = await import(
					"~/features/fossils/fossils.server"
				);
				try {
					const report = await refreshFossilIndexSlice({ budgetMs: BUDGET_MS });
					console.log("fossil refresh:", JSON.stringify(report));
					return Response.json({ ok: true, ...report });
				} catch (err) {
					console.error("fossil refresh failed:", err);
					return Response.json(
						{ ok: false, error: String(err) },
						{ status: 500 },
					);
				}
			},
		},
	},
});
