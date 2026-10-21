/**
 * Syncs the geosites collection from GEOSSIT (SGB/CPRM), adds each geosite's
 * geological age from SGB's geological map and attaches 3D models.
 * Usage: pnpm db:seed   (reads MONGODB_URI / MONGODB_DB from .env)
 *
 * Idempotent: re-running updates changed records and removes ones GEOSSIT dropped.
 * Run `pnpm models:fetch` first to self-host CC BY models instead of embedding them.
 * The same sync runs weekly in production (see /api/cron/sync-geosites).
 */
import {
	formatSyncReport,
	syncGeosites,
} from "~/features/geosites/sync.server";

const report = await syncGeosites({ log: console.log });
for (const s of report.skipped)
	console.warn(`Skipped GEOSSIT ${s.id}: ${s.reason}`);
console.log(formatSyncReport(report));
process.exit(0);
