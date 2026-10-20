/**
 * Syncs the geosites collection from GEOSSIT (SGB/CPRM).
 * Usage: pnpm db:seed   (reads MONGODB_URI / MONGODB_DB from .env)
 *
 * Idempotent: re-running updates changed records and removes ones GEOSSIT dropped.
 */
import {
	ensureGeositeIndexes,
	geositesCollection,
	syncSourcedGeosites,
} from "~/features/geosites/geosites.server";
import {
	fetchGeossitFeatures,
	mapGeossitFeatures,
} from "~/features/geosites/geossit.server";

const col = await geositesCollection();
await ensureGeositeIndexes(col);

// Hand-written sample geosites from the initial bootstrap have no `source`.
const legacy = await col.deleteMany({ source: { $exists: false } });
if (legacy.deletedCount > 0)
	console.log(`Removed ${legacy.deletedCount} legacy sample geosites.`);

console.log("Fetching GEOSSIT…");
const raw = await fetchGeossitFeatures();
const { geosites, skipped } = mapGeossitFeatures(raw);
for (const s of skipped) console.warn(`Skipped GEOSSIT ${s.id}: ${s.reason}`);

const sourced = geosites.map((g) => ({
	...g,
	source: g.source ?? raise(`geosite ${g.slug} has no source`),
}));

const result = await syncSourcedGeosites(col, "geossit", sourced);
const inGeoparks = sourced.filter((g) => g.geoparkId).length;
console.log(
	`GEOSSIT: ${raw.length} fetched, ${geosites.length} valid, ${skipped.length} skipped → ` +
		`${result.inserted} inserted, ${result.updated} updated, ${result.deleted} deleted. ` +
		`${inGeoparks} in UNESCO geoparks.`,
);
process.exit(0);

function raise(message: string): never {
	throw new Error(message);
}
