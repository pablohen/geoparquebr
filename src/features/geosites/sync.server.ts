/**
 * The full GEOSSIT sync, shared by `pnpm db:seed` and the weekly cron
 * (`/api/cron/sync-geosites`): fetch and validate GEOSSIT, add geological
 * ages, attach 3D models, upsert, prune what GEOSSIT dropped.
 *
 * Safe to run unattended: it writes nothing when GEOSSIT returns far fewer
 * records than are stored (a truncated response would otherwise prune most
 * geosites) or when most age lookups fail (it would wipe stored ages).
 * Points outside their state move to their municipality's centre.
 */
import { diffGeosites } from "~/features/news/changes";
import { recordChanges } from "~/features/news/news.server";
import { curatedAge } from "./age-catalog.server";
import { withGeologicAges } from "./geologic-age.server";
import {
	ensureGeositeIndexes,
	geositesCollection,
	syncSourcedGeosites,
} from "./geosites.server";
import { fetchGeossitFeatures, mapGeossitFeatures } from "./geossit.server";
import { modelsFor } from "./model-catalog.server";
import type { BrazilPlaces } from "./placement";

/** Below this share of the stored geosites, a GEOSSIT response is suspect. */
export const MIN_SHARE_OF_STORED = 0.8;
/** Above this share of failed age lookups, nothing is written. */
const MAX_FAILED_AGE_SHARE = 0.1;

export type SyncReport = {
	fetched: number;
	valid: number;
	skipped: { id: unknown; reason: string }[];
	inserted: number;
	updated: number;
	deleted: number;
	inGeoparks: number;
	models: number;
	/** Geosites placed at their municipality's centre (`placement.ts`). */
	approximate: string[];
	dated: number;
	ageLookupsFailed: number;
	/** Geosites added, changed (reader-facing fields) and removed. */
	changes: { added: number; changed: number; removed: number };
};

/** Throws, writing nothing, when `valid` is implausibly low against `stored`. */
export function assertPlausibleImport(valid: number, stored: number): void {
	if (valid < stored * MIN_SHARE_OF_STORED)
		throw new Error(
			`GEOSSIT returned ${valid} valid geosites but ${stored} are stored; refusing to prune on a possibly truncated response`,
		);
}

export async function syncGeosites({
	log = () => {},
}: {
	log?: (message: string) => void;
} = {}): Promise<SyncReport> {
	const col = await geositesCollection();
	await ensureGeositeIndexes(col);

	// Hand-written sample geosites from the initial bootstrap have no `source`.
	const legacy = await col.deleteMany({ source: { $exists: false } });
	if (legacy.deletedCount > 0)
		log(`Removed ${legacy.deletedCount} legacy sample geosites.`);

	log("Fetching GEOSSIT…");
	const raw = await fetchGeossitFeatures();
	// Half a megabyte of outlines, so only the sync loads it.
	const { default: places } = await import("./brazil-places.json");
	const { geosites, skipped } = mapGeossitFeatures(
		raw,
		places as unknown as BrazilPlaces,
	);
	assertPlausibleImport(
		geosites.length,
		await col.countDocuments({ "source.system": "geossit" }),
	);

	// GEOSSIT has no ages; take the unit SGB's map shows at each site. A
	// municipality's centre says nothing about the site's rock, so those
	// geosites only get a curated age.
	log("Looking up geological ages (SGB map)…");
	const aged = await withGeologicAges(
		geosites.filter((g) => !g.locationIsApproximate),
	);
	aged.geosites.push(...geosites.filter((g) => g.locationIsApproximate));
	if (aged.failed > geosites.length * MAX_FAILED_AGE_SHARE)
		throw new Error(
			`SGB age lookup failed for ${aged.failed}/${geosites.length} geosites; nothing was written`,
		);

	// modelsFor checks public/models for self-hosted GLBs. In a serverless
	// function that folder isn't on disk, so the cron attaches Sketchfab
	// embeds; fine while no GLB is self-hosted (see docs/3d-models.md).
	const records = aged.geosites.map((g) => {
		if (!g.source) throw new Error(`geosite ${g.slug} has no source`);
		return {
			...g,
			source: g.source,
			// A curated, sourced age beats the one read off the map at the point.
			geologicAge: curatedAge(g.source) ?? g.geologicAge,
			models: modelsFor({ source: g.source, categories: g.categories }),
		};
	});

	// Read before the write and compared with the import, for the "Novidades"
	// page. A first import into an empty database isn't news.
	const before = await col
		.find({ "source.system": "geossit" }, { projection: { _id: 0, models: 0 } })
		.toArray();
	const result = await syncSourcedGeosites(col, "geossit", records);
	const changes = diffGeosites(before, records);
	if (before.length > 0) await recordChanges(changes);
	return {
		fetched: raw.length,
		valid: geosites.length,
		skipped,
		...result,
		inGeoparks: records.filter((g) => g.geoparkId).length,
		models: records.reduce((n, g) => n + g.models.length, 0),
		approximate: records
			.filter((g) => g.locationIsApproximate)
			.map((g) => g.slug),
		dated: records.filter((g) => g.geologicAge?.maxMa).length,
		ageLookupsFailed: aged.failed,
		changes: {
			added: changes.added.length,
			changed: changes.changed.length,
			removed: changes.removed.length,
		},
	};
}

/** One line for logs. */
export const formatSyncReport = (r: SyncReport) =>
	`GEOSSIT: ${r.fetched} fetched, ${r.valid} valid, ${r.skipped.length} skipped → ` +
	`${r.inserted} inserted, ${r.updated} updated, ${r.deleted} deleted. ` +
	`${r.inGeoparks} in UNESCO geoparks; ${r.models} 3D model attachments. ` +
	`${r.approximate.length} at their municipality's centre` +
	(r.approximate.length ? ` (${r.approximate.join(", ")}). ` : ". ") +
	`Ages: ${r.dated} dated, ${r.ageLookupsFailed} lookups failed. ` +
	`Changes: ${r.changes.added} added, ${r.changes.changed} changed, ${r.changes.removed} removed.`;
