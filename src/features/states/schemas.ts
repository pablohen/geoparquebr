/** A state's page. Isomorphic. */
import { z } from "zod";
import { GenusLinkSchema } from "~/features/fossils/schemas";
import {
	BBoxSchema,
	GeoparkIdSchema,
	GeositeSchema,
} from "~/features/geosites/schemas";
import { RankedGeositeSchema } from "~/features/rankings/schemas";
import { TallySchema } from "~/features/stats/schemas";
import { REGION_IDS, UFS } from "./states";

export const UfSchema = z.enum(UFS);

/** The route param: "pe" → "PE"; anything else is not a state. */
export const UfParamSchema = z
	.string()
	.transform((s) => s.toUpperCase())
	.pipe(UfSchema);

export const StateGeositeSchema = GeositeSchema.pick({
	slug: true,
	name: true,
	municipality: true,
	relevance: true,
	geoparkId: true,
});
export type StateGeosite = z.infer<typeof StateGeositeSchema>;

export const StatePageSchema = z.object({
	uf: UfSchema,
	tally: TallySchema,
	/** Around the geosites' public points, to frame the map. */
	bbox: BBoxSchema,
	/** By name. */
	geosites: z.array(StateGeositeSchema),
	/** Highest scientific value first. */
	top: z.array(RankedGeositeSchema),
	geoparks: z.array(GeoparkIdSchema),
	genera: z.array(GenusLinkSchema),
});
export type StatePage = z.infer<typeof StatePageSchema>;

export const TOP_IN_STATE = 5;

export const RegionSchema = z.enum(REGION_IDS);

export const RegionPageSchema = z.object({
	region: RegionSchema,
	tally: TallySchema,
	bbox: BBoxSchema,
	/** The region's states with geosites, most first. */
	states: z.array(
		z.object({
			uf: UfSchema,
			total: z.number().int(),
			international: z.number().int(),
			geoparks: z.number().int(),
		}),
	),
	geoparks: z.array(GeoparkIdSchema),
	genera: z.array(GenusLinkSchema),
});
export type RegionPage = z.infer<typeof RegionPageSchema>;
