import type { z } from "zod";
import { GeositeSummarySchema } from "~/features/geosites/schemas";

/** A geosite as listed on its geopark's page. */
export const GeoparkGeositeSchema = GeositeSummarySchema.omit({
	distanceMeters: true,
	geoparkId: true,
});
export type GeoparkGeosite = z.infer<typeof GeoparkGeositeSchema>;
