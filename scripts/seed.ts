/**
 * Syncs the geosites collection from GEOSSIT (SGB/CPRM), adds each geosite's
 * geological age from SGB's geological map and attaches 3D models.
 * Usage: pnpm db:seed   (reads MONGODB_URI / MONGODB_DB from .env)
 *
 * Idempotent: re-running updates changed records and removes ones GEOSSIT dropped.
 * Run `pnpm models:fetch` first to self-host CC BY models instead of embedding them.
 */

import { withGeologicAges } from "~/features/geosites/geologic-age.server";
import {
	ensureGeositeIndexes,
	geositesCollection,
	syncSourcedGeosites,
} from "~/features/geosites/geosites.server";
import {
	fetchGeossitFeatures,
	mapGeossitFeatures,
} from "~/features/geosites/geossit.server";
import { modelsFor } from "~/features/geosites/model-catalog.server";

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

// GEOSSIT has no ages; take the unit SGB's 1:1M map shows at each site.
console.log("Looking up geological ages (SGB map)…");
const aged = await withGeologicAges(geosites);
// A mostly failed lookup would wipe the ages already stored; stop instead.
if (aged.failed > geosites.length * 0.1)
	raise(
		`SGB age lookup failed for ${aged.failed}/${geosites.length} geosites; nothing was written`,
	);

const withModels = aged.geosites.map((g) => ({
	...g,
	source: g.source ?? raise(`geosite ${g.slug} has no source`),
	models: modelsFor({ source: g.source, categories: g.categories }),
}));

const result = await syncSourcedGeosites(col, "geossit", withModels);
const inGeoparks = withModels.filter((g) => g.geoparkId).length;
const modelCount = withModels.reduce((n, g) => n + g.models.length, 0);
console.log(
	`GEOSSIT: ${raw.length} fetched, ${geosites.length} valid, ${skipped.length} skipped → ` +
		`${result.inserted} inserted, ${result.updated} updated, ${result.deleted} deleted. ` +
		`${inGeoparks} in UNESCO geoparks; ${modelCount} 3D model attachments. ` +
		`Ages: ${withModels.filter((g) => g.geologicAge?.maxMa).length} dated, ${aged.failed} lookups failed.`,
);
process.exit(0);

function raise(message: string): never {
	throw new Error(message);
}
