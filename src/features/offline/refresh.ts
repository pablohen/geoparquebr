/**
 * Brings geoparks saved for offline use up to date with what the device now
 * keeps for each geosite. Saves made before ages and scores were kept can't
 * apply the age or score filters offline; refetching their list (a small
 * request, no pages or tiles) fixes that without asking for a new save.
 */
import { getGeoparkGeosites } from "~/features/geoparks/geoparks.functions";
import type { GeoparkGeosite } from "~/features/geoparks/schemas";
import { GeoparkIdSchema } from "~/features/geosites/schemas";
import { type SavedGeoparks, savedGeoparks } from "./store";

/** Saved before ages and scores were kept: none of its geosites has either. */
export const needsRefresh = (geosites: readonly GeoparkGeosite[]) =>
	geosites.length > 0 &&
	geosites.every(
		(g) =>
			g.scores === undefined && g.minMa === undefined && g.maxMa === undefined,
	);

/** The saved geoparks with an old geosite list, by id. */
export const staleGeoparks = (saved: SavedGeoparks) =>
	Object.entries(saved).flatMap(([id, entry]) =>
		entry && needsRefresh(entry.geosites) ? [GeoparkIdSchema.parse(id)] : [],
	);

/**
 * Refetches each stale geopark's list and stores it, keeping the save date
 * and failure count. Failures are ignored: the old list still works.
 */
export async function refreshSavedGeoparks(): Promise<void> {
	for (const id of staleGeoparks(savedGeoparks.read())) {
		try {
			const geosites = await getGeoparkGeosites({ data: { id } });
			const current = savedGeoparks.read();
			const entry = current[id];
			// Removed meanwhile: don't bring it back.
			if (entry)
				savedGeoparks.write({ ...current, [id]: { ...entry, geosites } });
		} catch {
			// Offline or a server error; try again next session.
		}
	}
}
