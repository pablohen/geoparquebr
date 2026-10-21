/** A trip: geosites to visit, in order. Isomorphic. */
import { z } from "zod";
import {
	GeoparkIdSchema,
	PositionSchema,
	SlugSchema,
} from "~/features/geosites/schemas";

export const MAX_TRIP_STOPS = 25;

/** A stop with the geosite's public point (rounded ~1 km if sensitive). */
export const TripStopSchema = z.object({
	slug: SlugSchema,
	name: z.string().min(1).max(200),
	municipality: z.string().max(120),
	state: z.string().max(2),
	geoparkId: GeoparkIdSchema.optional(),
	point: PositionSchema,
	approximate: z.boolean(),
});
export type TripStop = z.infer<typeof TripStopSchema>;

/**
 * `/trip?stops=a,b,c`: a shared trip, by slug. Kept as the raw string (the
 * router re-validates parsed search, so a transform here would not survive);
 * `parseTripSlugs` splits it.
 */
export const TripSearchSchema = z.object({
	stops: z.string().max(3_000).optional().catch(undefined),
});

/** "a,b,a,bad slug" → ["a", "b"], at most MAX_TRIP_STOPS. */
export function parseTripSlugs(stops: string | undefined): string[] {
	const slugs = (stops ?? "")
		.split(",")
		.map((s) => s.trim())
		.filter((s) => SlugSchema.safeParse(s).success);
	return [...new Set(slugs)].slice(0, MAX_TRIP_STOPS);
}

export const TripSlugsSchema = z.object({
	slugs: z.array(SlugSchema).min(1).max(MAX_TRIP_STOPS),
});
