/** The geosite of the day. Isomorphic. */
import { z } from "zod";
import { GeositeSchema } from "~/features/geosites/schemas";

export const DailyGeositeSchema = GeositeSchema.pick({
	slug: true,
	name: true,
	municipality: true,
	state: true,
	geoparkId: true,
	summary: true,
}).extend({
	/** "YYYY-MM-DD" in São Paulo. */
	day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type DailyGeosite = z.infer<typeof DailyGeositeSchema>;
