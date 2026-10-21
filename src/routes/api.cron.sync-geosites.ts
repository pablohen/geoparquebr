import { createFileRoute } from "@tanstack/react-router";

/**
 * Weekly GEOSSIT sync, called by Vercel Cron (schedule in vite.config.ts).
 * Same code as `pnpm db:seed`; refuses requests without the cron secret.
 */
export const Route = createFileRoute("/api/cron/sync-geosites")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				// Loaded lazily so the Mongo driver stays out of the client graph.
				const { isAuthorizedCron } = await import(
					"~/features/geosites/cron.server"
				);
				if (!isAuthorizedCron(request))
					return new Response("Unauthorized", { status: 401 });
				const { formatSyncReport, syncGeosites } = await import(
					"~/features/geosites/sync.server"
				);
				try {
					const report = await syncGeosites({ log: console.log });
					console.log(formatSyncReport(report));
					const { skipped, ...counts } = report;
					return Response.json({
						ok: true,
						...counts,
						skipped: skipped.length,
					});
				} catch (err) {
					console.error("GEOSSIT sync failed:", err);
					return Response.json(
						{ ok: false, error: String(err) },
						{ status: 500 },
					);
				}
			},
		},
	},
});
