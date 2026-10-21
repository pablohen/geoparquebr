/**
 * Refreshes every geosite's fossil records (`fossil_sites`) and rebuilds the
 * genus pages (`fossil_genera`): records within 5 km of each geosite (SGB,
 * GBIF), matched against the GBIF backbone taxonomy. Run it after
 * `pnpm db:seed`; in production a daily cron also refreshes them in slices.
 * Usage: pnpm db:fossils   (reads MONGODB_URI / MONGODB_DB from .env)
 *
 * Upstream lookups are cached in `api_cache`, so a re-run within a week is quick.
 */
import { buildFossilIndex } from "~/features/fossils/fossils.server";

const report = await buildFossilIndex({ log: console.log });
console.log(
	`${report.genera} genera from ${report.refreshed}/${report.geosites} geosites ` +
		`(${report.failed} failed, ${report.deleted} genera removed)`,
);
process.exit(0);
