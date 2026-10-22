import { z } from "zod";
import {
	GeositeScoresSchema,
	GeositeSummarySchema,
} from "~/features/geosites/schemas";

/**
 * A geosite as listed on its geopark's page. The age range and scores let
 * the map's age and score filters work on the copy saved for offline use.
 */
export const GeoparkGeositeSchema = GeositeSummarySchema.omit({
	distanceMeters: true,
	geoparkId: true,
}).extend({
	minMa: z.number().nonnegative().optional(),
	maxMa: z.number().nonnegative().optional(),
	scores: GeositeScoresSchema.optional(),
});
export type GeoparkGeosite = z.infer<typeof GeoparkGeositeSchema>;
