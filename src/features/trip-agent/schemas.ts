/**
 * Shapes the trip-planning agent's tools take and return. Isomorphic: the
 * chat panel parses tool output with the same schemas. No coordinates: the
 * model never needs them, and the trip card reads public points itself.
 */
import { z } from "zod";
import {
	DegradationRiskSchema,
	GeoparkIdSchema,
	GeositeCategorySchema,
	RelevanceSchema,
	SlugSchema,
	UfSchema,
} from "~/features/geosites/schemas";
import { MAX_TRIP_STOPS, TripStopSchema } from "~/features/trip/schemas";

/** A geosite as the model sees it in lists. */
export const AgentGeositeSchema = z.object({
	slug: SlugSchema,
	name: z.string(),
	municipality: z.string(),
	state: z.string(),
	geoparkId: GeoparkIdSchema.optional(),
	categories: z.array(GeositeCategorySchema),
	relevance: RelevanceSchema,
	/** GEOSSIT marks, 0–400. */
	tourism: z.number().optional(),
	didactic: z.number().optional(),
	scientific: z.number().optional(),
	degradationRisk: DegradationRiskSchema.optional(),
	/** The point is a municipality's centre: never plan a visit to it. */
	locationIsApproximate: z.boolean(),
	/** A fragile cave or fossil bed whose exact place is withheld. */
	locationIsSensitive: z.boolean(),
});
export type AgentGeosite = z.infer<typeof AgentGeositeSchema>;

export const SearchGeositesInputSchema = z.object({
	query: z
		.string()
		.trim()
		.min(2)
		.max(100)
		.optional()
		.describe("Free text: a name, municipality or topic, in Portuguese."),
	geoparkId: GeoparkIdSchema.optional(),
	state: UfSchema.optional().describe("Two-letter state code, e.g. CE."),
	categories: z.array(GeositeCategorySchema).max(5).optional(),
	minTourism: z
		.number()
		.int()
		.min(1)
		.max(400)
		.optional()
		.describe("Minimum GEOSSIT tourism mark (0–400)."),
	limit: z.number().int().min(1).max(30).default(15),
});
export type SearchGeositesInput = z.input<typeof SearchGeositesInputSchema>;

export const SlugInputSchema = z.object({ slug: SlugSchema });

/**
 * A geopark or a state. A flat object rather than `ItinerariesQuerySchema`'s
 * union: model providers want a plain object at the top of a tool's input.
 */
export const ItinerariesInputSchema = z
	.object({ gp: GeoparkIdSchema.optional(), uf: UfSchema.optional() })
	.refine((q) => !!q.gp !== !!q.uf, "give exactly one of gp or uf");

/** One geosite in full, as far as a visitor needs it. */
export const AgentGeositeDetailSchema = AgentGeositeSchema.extend({
	summary: z.string(),
	/** Trimmed: GEOSSIT descriptions run to pages. */
	description: z.string().optional(),
	period: z.string().optional(),
	formation: z.string().optional(),
	protectedAreas: z.array(z.string()),
	path: z.string(),
});
export type AgentGeositeDetail = z.infer<typeof AgentGeositeDetailSchema>;

/** A nearby geosite, with the distance between public points (100 m). */
export const AgentNearbySchema = AgentGeositeSchema.pick({
	slug: true,
	name: true,
	municipality: true,
	state: true,
	categories: true,
	locationIsApproximate: true,
}).extend({ distanceKm: z.number() });

export const ProposeTripInputSchema = z.object({
	title: z.string().trim().min(2).max(80),
	stops: z
		.array(SlugSchema)
		.min(1)
		.max(MAX_TRIP_STOPS)
		.describe("Geosite slugs in visiting order."),
	notes: z.string().trim().max(600).optional(),
});

/** What the chat panel draws as a trip card. */
export const TripProposalSchema = z.object({
	title: z.string(),
	notes: z.string().optional(),
	stops: z.array(TripStopSchema),
	/** Straight-line length between stops, rounded to whole kilometres. */
	totalKm: z.number(),
	/** Slugs left out: unknown, or approximate points. */
	skipped: z.array(z.string()),
});
export type TripProposal = z.infer<typeof TripProposalSchema>;

/** `/trip?stops=a,b,c`, the existing shared-trip page. */
export const tripHref = (proposal: Pick<TripProposal, "stops">) =>
	`/trip?stops=${proposal.stops.map((s) => s.slug).join(",")}`;
