/** Rock unit pages. Isomorphic. */
import { z } from "zod";
import { GenusLinkSchema } from "~/features/fossils/schemas";
import { GeositeSchema } from "~/features/geosites/schemas";

export const UnitSlugSchema = z
	.string()
	.min(2)
	.max(120)
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const UnitSummarySchema = z.object({
	slug: UnitSlugSchema,
	name: z.string(),
	geositeCount: z.number().int().positive(),
});
export type UnitSummary = z.infer<typeof UnitSummarySchema>;

export const UnitGeositeSchema = GeositeSchema.pick({
	slug: true,
	name: true,
	municipality: true,
	state: true,
	geoparkId: true,
}).extend({
	/** Other units mapped at the same point (a contact). */
	alongside: z.array(z.string()),
});
export type UnitGeosite = z.infer<typeof UnitGeositeSchema>;

export const UnitPageSchema = UnitSummarySchema.extend({
	/**
	 * The unit's age on SGB's map, read from geosites where it is the only
	 * unit mapped (elsewhere the age spans every unit at the point).
	 */
	age: z
		.object({
			period: z.string(),
			minMa: z.number().optional(),
			maxMa: z.number().optional(),
			mapScale: z.number().int().optional(),
		})
		.optional(),
	geosites: z.array(UnitGeositeSchema),
	genera: z.array(GenusLinkSchema),
});
export type UnitPage = z.infer<typeof UnitPageSchema>;
