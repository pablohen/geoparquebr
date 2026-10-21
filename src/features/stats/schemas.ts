/** Counts behind the numbers, timeline and comparison pages. Isomorphic. */
import { z } from "zod";
import {
	GeologicPeriodSchema,
	GeoparkIdSchema,
	GeositeCategorySchema,
	RelevanceSchema,
} from "~/features/geosites/schemas";

/** What the counts read from each geosite; no coordinates. */
export const StatsRowSchema = z.object({
	slug: z.string(),
	name: z.string(),
	municipality: z.string(),
	state: z.string(),
	categories: z.array(GeositeCategorySchema),
	relevance: RelevanceSchema,
	geoparkId: GeoparkIdSchema.optional(),
	minMa: z.number().optional(),
	maxMa: z.number().optional(),
});
export type StatsRow = z.infer<typeof StatsRowSchema>;

const countOf = <K extends z.ZodType>(key: K) =>
	z.object({ key, count: z.number().int().nonnegative() });

/** Counts for a set of geosites (all of Brazil, or one geopark). */
export const TallySchema = z.object({
	total: z.number().int(),
	/** Geosites with a dated age range, the only ones placed on the timeline. */
	dated: z.number().int(),
	/** Most first. */
	states: z.array(countOf(z.string())),
	/** Most first; a geosite counts once in each of its categories. */
	categories: z.array(countOf(GeositeCategorySchema)),
	/** International → geodiversity, zeros kept. */
	relevance: z.array(countOf(RelevanceSchema)),
	/** Youngest first, zeros kept; a geosite counts in every period it spans. */
	periods: z.array(countOf(GeologicPeriodSchema)),
});
export type Tally = z.infer<typeof TallySchema>;

export const GeositeStatsSchema = TallySchema.extend({
	/** Fossil genera indexed on /fossils. */
	genera: z.number().int(),
	geoparks: z.array(
		TallySchema.extend({
			id: GeoparkIdSchema,
			/** Fossil genera recorded near the geopark's geosites. */
			genera: z.number().int(),
		}),
	),
});
export type GeositeStats = z.infer<typeof GeositeStatsSchema>;

export const TimelineGeositeSchema = StatsRowSchema.pick({
	slug: true,
	name: true,
	municipality: true,
	state: true,
});
export type TimelineGeosite = z.infer<typeof TimelineGeositeSchema>;

export const TimelineSchema = z.object({
	/** Youngest first, every period, each with its geosites by name. */
	periods: z.array(
		z.object({
			id: GeologicPeriodSchema,
			geosites: z.array(TimelineGeositeSchema),
		}),
	),
	total: z.number().int(),
	undated: z.number().int(),
});
export type Timeline = z.infer<typeof TimelineSchema>;

export const STATS_PATH = "/stats";
export const TIMELINE_PATH = "/timeline";
export const COMPARE_PATH = "/geoparks/compare";
