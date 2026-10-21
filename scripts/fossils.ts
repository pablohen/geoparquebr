/**
 * Rebuilds the fossil genus index (`fossil_genera`) behind the /fossils pages:
 * fossil records within 5 km of every geosite (SGB, GBIF), matched against the
 * GBIF backbone taxonomy. Run it after `pnpm db:seed`.
 * Usage: pnpm db:fossils   (reads MONGODB_URI / MONGODB_DB from .env)
 *
 * Upstream lookups are cached in `api_cache`, so a re-run within a week is quick.
 */
import { buildFossilIndex } from "~/features/fossils/fossils.server";

const report = await buildFossilIndex({ log: console.log });
console.log(
	`${report.genera} genera from ${report.geosites} geosites ` +
		`(${report.unmatchedNames} names without a GBIF genus, ` +
		`${report.failedLookups} failed lookups, ${report.failedMatches} failed matches, ` +
		`${report.deleted} removed)`,
);
process.exit(0);
