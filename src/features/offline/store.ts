/**
 * Geoparks saved for offline use on this device: when, and their geosites,
 * so the map can still list and draw them offline wherever you pan (cached
 * list responses only match their exact viewport).
 */
import { z } from "zod";
import { periodRangeMa } from "~/features/geology/time-scale";
import { GeoparkGeositeSchema } from "~/features/geoparks/schemas";
import {
	GeoparkIdSchema,
	type GeositeSummary,
	type GeositesInBoundsQuery,
} from "~/features/geosites/schemas";
import { bboxCenter, haversineMeters } from "~/lib/geo";
import { createLocalStore } from "~/lib/local-store";

const SavedGeoparkSchema = z.object({
	savedAt: z.iso.datetime(),
	/** Items that couldn't be fetched; non-zero means "update when you can". */
	failed: z.number().int().nonnegative(),
	geosites: z.array(GeoparkGeositeSchema).default([]),
});
export type SavedGeopark = z.infer<typeof SavedGeoparkSchema>;

const SavedGeoparksSchema = z.partialRecord(
	GeoparkIdSchema,
	SavedGeoparkSchema,
);
export type SavedGeoparks = z.infer<typeof SavedGeoparksSchema>;

const EMPTY: SavedGeoparks = Object.freeze({});

export function parseSavedGeoparks(raw: string | null): SavedGeoparks {
	if (!raw) return EMPTY;
	try {
		const parsed = SavedGeoparksSchema.safeParse(JSON.parse(raw));
		return parsed.success ? parsed.data : EMPTY;
	} catch {
		return EMPTY;
	}
}

export const savedGeoparks = createLocalStore(
	"geoparquebr:offline-geoparks:v1",
	parseSavedGeoparks,
	EMPTY,
);

/**
 * The viewport list from saved geoparks, for when the network is gone:
 * geosites inside the box that pass the same filters as the server's list,
 * nearest to the box centre first. Ages overlap a period by the server's
 * rule (`ageOverlaps`); geosites without an age or that score drop out.
 * Geoparks saved before ages and scores were kept have neither, so those
 * filters list nothing from them until they're saved again.
 */
export function savedGeositesInBounds(
	saved: SavedGeoparks,
	query: GeositesInBoundsQuery,
): GeositeSummary[] {
	const [w, s, e, n] = query.bbox;
	const [young, old] = query.age ? periodRangeMa(query.age) : [0, 0];
	const { minScore } = query;
	const centre = bboxCenter(query.bbox);
	return Object.entries(saved)
		.filter(([id]) => !query.geoparkId || id === query.geoparkId)
		.flatMap(([id, entry]) =>
			(entry?.geosites ?? []).map((g) => ({
				...g,
				geoparkId: GeoparkIdSchema.parse(id),
			})),
		)
		.filter((g) => {
			const [lng, lat] = g.location.coordinates;
			return (
				lng >= w &&
				lng <= e &&
				lat >= s &&
				lat <= n &&
				(!query.states?.length || query.states.some((uf) => uf === g.state)) &&
				(!query.categories?.length ||
					g.categories.some((c) => query.categories?.includes(c))) &&
				(!query.relevance || g.relevance === query.relevance) &&
				(!query.age ||
					(g.maxMa !== undefined &&
						g.minMa !== undefined &&
						g.maxMa > young &&
						g.minMa < old)) &&
				(!minScore || (g.scores?.[minScore.key] ?? -1) >= minScore.min)
			);
		})
		.map((g) => ({
			...g,
			distanceMeters: haversineMeters(centre, g.location.coordinates),
		}))
		.sort((a, b) => a.distanceMeters - b.distanceMeters);
}
