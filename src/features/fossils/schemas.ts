/** Fossil genera recorded near geosites. Isomorphic. */
import { z } from "zod";
import { GeoparkIdSchema } from "~/features/geosites/schemas";

export const GenusSlugSchema = z.string().regex(/^[a-z]{3,}(-\d+)?$/);

export const ClassificationSchema = z.object({
	kingdom: z.string().optional(),
	phylum: z.string().optional(),
	class: z.string().optional(),
	order: z.string().optional(),
	family: z.string().optional(),
});
export type Classification = z.infer<typeof ClassificationSchema>;

/** A geosite with records of the genus within FOSSIL_SEARCH_RADIUS_KM. */
export const GenusGeositeSchema = z.object({
	slug: z.string(),
	name: z.string(),
	municipality: z.string(),
	state: z.string(),
	geoparkId: GeoparkIdSchema.optional(),
	records: z.number().int().positive(),
});
export type GenusGeosite = z.infer<typeof GenusGeositeSchema>;

export const FossilGenusSchema = z.object({
	slug: GenusSlugSchema,
	name: z.string(),
	gbifKey: z.number().int(),
	classification: ClassificationSchema,
	/** Accepted species names recorded, sorted. */
	species: z.array(z.string()),
	geosites: z.array(GenusGeositeSchema).min(1),
	/** Lithostratigraphic units and ages as recorded by the sources. */
	units: z.array(z.string()),
	ages: z.array(z.string()),
	records: z.object({ sgb: z.number().int(), gbif: z.number().int() }),
	updatedAt: z.iso.datetime(),
});
export type FossilGenus = z.infer<typeof FossilGenusSchema>;

export const FossilGenusSummarySchema = FossilGenusSchema.pick({
	slug: true,
	name: true,
	classification: true,
}).extend({
	geositeCount: z.number().int(),
	speciesCount: z.number().int(),
	/** Geoparks of the geosites with records, for the index's filter. */
	geoparks: z.array(GeoparkIdSchema),
});
export type FossilGenusSummary = z.infer<typeof FossilGenusSummarySchema>;

/** `/fossils` filters, kept in the URL so a filtered list can be shared. */
export const FossilsSearchSchema = z.object({
	q: z.string().trim().max(60).optional().catch(undefined),
	/** GBIF class (or phylum when the class is unknown); "other" for neither. */
	group: z.string().max(60).optional().catch(undefined),
	gp: GeoparkIdSchema.optional().catch(undefined),
});
export type FossilsSearch = z.infer<typeof FossilsSearchSchema>;

/** A genus as linked from a geosite or geopark. */
export const GenusLinkSchema = FossilGenusSchema.pick({
	slug: true,
	name: true,
});
export type GenusLink = z.infer<typeof GenusLinkSchema>;

/** A genus in the header search. */
export const GenusSearchHitSchema = GenusLinkSchema.extend({
	group: z.string().optional(),
	geositeCount: z.number().int(),
});
export type GenusSearchHit = z.infer<typeof GenusSearchHitSchema>;

/** The index groups genera by GBIF class, then phylum; "" when neither is known. */
export const genusGroup = (c: Classification) => c.class ?? c.phylum ?? "";
