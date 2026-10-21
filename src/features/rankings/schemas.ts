/** Geosites ranked by their GEOSSIT scores. Isomorphic. */
import { z } from "zod";
import {
	GeoparkIdSchema,
	GeositeSchema,
	GeositeScoresSchema,
} from "~/features/geosites/schemas";

export const ScoreKeySchema = GeositeScoresSchema.keyof();
export type ScoreKey = z.infer<typeof ScoreKeySchema>;

const StateSchema = z.string().regex(/^[A-Z]{2}$/);

/** `/rankings` filters, in the URL so a ranking can be shared. */
export const RankingsSearchSchema = z.object({
	/** Omitted means "scientific". */
	by: ScoreKeySchema.optional().catch(undefined),
	gp: GeoparkIdSchema.optional().catch(undefined),
	uf: StateSchema.optional().catch(undefined),
});
export type RankingsSearch = z.infer<typeof RankingsSearchSchema>;

export const RankingsQuerySchema = z.object({
	by: ScoreKeySchema,
	gp: GeoparkIdSchema.optional(),
	uf: StateSchema.optional(),
});
export type RankingsQuery = z.infer<typeof RankingsQuerySchema>;

/** What a ranking reads from each geosite; no coordinates. */
export const ScoredGeositeSchema = GeositeSchema.pick({
	slug: true,
	name: true,
	municipality: true,
	state: true,
	geoparkId: true,
}).extend({ scores: GeositeScoresSchema });
export type ScoredGeosite = z.infer<typeof ScoredGeositeSchema>;

export const RankedGeositeSchema = ScoredGeositeSchema.extend({
	/** Shared by ties: 1, 1, 3, … */
	rank: z.number().int().positive(),
});
export type RankedGeosite = z.infer<typeof RankedGeositeSchema>;

export const RankingsSchema = z.object({
	items: z.array(RankedGeositeSchema),
	/** Geosites matching the filters, of which `items` are the top. */
	total: z.number().int(),
	/** Every state with a scored geosite, for the filter. */
	states: z.array(z.string()),
});
export type Rankings = z.infer<typeof RankingsSchema>;

export const RANKINGS_PATH = "/rankings";
export const RANKING_SIZE = 25;
