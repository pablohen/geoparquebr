/**
 * Geoparks saved for offline use on this device: when, and their geosites,
 * so the map can still list and draw them offline wherever you pan (cached
 * list responses only match their exact viewport).
 */
import { z } from "zod";
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
 * geosites inside the box that pass the category, relevance and geopark
 * filters, nearest to the box centre first. The age filter needs data the
 * device doesn't keep, so with it set this returns nothing rather than guess.
 */
export function savedGeositesInBounds(
	saved: SavedGeoparks,
	query: GeositesInBoundsQuery,
): GeositeSummary[] {
	// Saved summaries carry neither ages nor scores to filter on.
	if (query.age || query.minScore) return [];
	const [w, s, e, n] = query.bbox;
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
				(!query.categories?.length ||
					g.categories.some((c) => query.categories?.includes(c))) &&
				(!query.relevance || g.relevance === query.relevance)
			);
		})
		.map((g) => ({
			...g,
			distanceMeters: haversineMeters(centre, g.location.coordinates),
		}))
		.sort((a, b) => a.distanceMeters - b.distanceMeters);
}
