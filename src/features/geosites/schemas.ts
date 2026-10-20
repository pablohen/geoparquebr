/**
 * Geosite domain schemas — the single source of truth shared by
 * route search params, React Hook Form, server functions and the Mongo layer.
 *
 * Isomorphic: imports nothing server-only, so it is safe in client bundles.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// GeoJSON
// ---------------------------------------------------------------------------

export const LongitudeSchema = z.number().min(-180).max(180);
export const LatitudeSchema = z.number().min(-90).max(90);

/** GeoJSON order is [longitude, latitude] — the reverse of most map UIs. */
export const PositionSchema = z.tuple([LongitudeSchema, LatitudeSchema]);
export type Position = z.infer<typeof PositionSchema>;

/** Stored as-is in Mongo and indexed with `2dsphere`. */
export const GeoPointSchema = z.object({
	type: z.literal("Point"),
	coordinates: PositionSchema,
});
export type GeoPoint = z.infer<typeof GeoPointSchema>;

// ---------------------------------------------------------------------------
// Taxonomy
// ---------------------------------------------------------------------------

/** Covers every GEOSSIT "temática principal" (see `geossit.server.ts` for the mapping). */
export const GEOSITE_CATEGORIES = [
	"paleontological",
	"paleoenvironmental",
	"geomorphological",
	"speleological",
	"stratigraphic",
	"sedimentological",
	"mineralogical",
	"petrological",
	"igneous",
	"metamorphic",
	"tectonic",
	"hydrogeological",
	"metallogenic",
	"pedological",
	"impact",
	"marine",
	"historical",
] as const;

export const GeositeCategorySchema = z.enum(GEOSITE_CATEGORIES);
export type GeositeCategory = z.infer<typeof GeositeCategorySchema>;

export const GEOSITE_CATEGORY_LABELS = {
	paleontological: "Paleontológico",
	paleoenvironmental: "Paleoambiental",
	geomorphological: "Geomorfológico",
	speleological: "Espeleológico (carste)",
	stratigraphic: "Estratigráfico",
	sedimentological: "Sedimentológico",
	mineralogical: "Mineralógico",
	petrological: "Petrológico",
	igneous: "Ígneo (plutonismo/vulcanismo)",
	metamorphic: "Metamórfico",
	tectonic: "Tectônico",
	hydrogeological: "Hidrogeológico",
	metallogenic: "Metalogenético",
	pedological: "Pedológico",
	impact: "Astroblema",
	marine: "Ambiente marinho",
	historical: "História da geologia/mineração",
} as const satisfies Record<GeositeCategory, string>;

/** UNESCO Global Geoparks in Brazil (plus aspiring ones as they're added). */
export const GEOPARK_IDS = [
	"araripe",
	"serido",
	"caminhos-dos-canions-do-sul",
	"quarta-colonia",
	"cacapava",
	"uberaba",
] as const;
export const GeoparkIdSchema = z.enum(GEOPARK_IDS);
export type GeoparkId = z.infer<typeof GeoparkIdSchema>;

export const GEOPARK_LABELS = {
	araripe: "Geoparque Araripe (CE)",
	serido: "Geoparque Seridó (RN)",
	"caminhos-dos-canions-do-sul":
		"Geoparque Caminhos dos Cânions do Sul (SC/RS)",
	"quarta-colonia": "Geoparque Quarta Colônia (RS)",
	cacapava: "Geoparque Caçapava (RS)",
	uberaba: "Geoparque Uberaba – Terra de Gigantes (MG)",
} as const satisfies Record<GeoparkId, string>;

/** GEOSSIT's "indicativo de relevância". */
export const RelevanceSchema = z.enum([
	"international",
	"national",
	"geodiversity",
]);
export type Relevance = z.infer<typeof RelevanceSchema>;

export const RELEVANCE_LABELS = {
	international: "Geossítio de relevância internacional",
	national: "Geossítio de relevância nacional",
	geodiversity: "Sítio da geodiversidade",
} as const satisfies Record<Relevance, string>;

export const DegradationRiskSchema = z.enum(["low", "medium", "high"]);
export type DegradationRisk = z.infer<typeof DegradationRiskSchema>;

export const DEGRADATION_RISK_LABELS = {
	low: "Baixo",
	medium: "Médio",
	high: "Alto",
} as const satisfies Record<DegradationRisk, string>;

const ScoreSchema = z.number().int().min(0).max(400);

/** GEOSSIT quantitative assessment, each on a 0–400 scale. */
export const GeositeScoresSchema = z.object({
	scientific: ScoreSchema,
	tourism: ScoreSchema,
	didactic: ScoreSchema,
	vulnerability: ScoreSchema,
});
export type GeositeScores = z.infer<typeof GeositeScoresSchema>;

/** Where a record came from, so re-imports update instead of duplicating. */
export const GeositeSourceSchema = z.object({
	system: z.literal("geossit"),
	id: z.number().int().positive(),
	url: z.url(),
	authors: z.string().max(5_000).optional(),
	updatedAt: z.iso.datetime().optional(),
});

/** Geological time, kept loose on purpose: ages in Ma (mega-annum, millions of years ago). */
export const GeologicAgeSchema = z
	.object({
		period: z.string().min(1).max(64), // e.g. "Cretáceo Inferior"
		formation: z.string().max(128).optional(), // e.g. "Formação Santana"
		minMa: z.number().nonnegative().optional(),
		maxMa: z.number().nonnegative().optional(),
	})
	.refine(
		(a) => a.minMa === undefined || a.maxMa === undefined || a.minMa <= a.maxMa,
		{
			message: "minMa must be ≤ maxMa",
			path: ["minMa"],
		},
	);

// ---------------------------------------------------------------------------
// 3D assets
// ---------------------------------------------------------------------------

/**
 * How a model relates to the geosite it's attached to. Be honest here:
 * a museum specimen from "somewhere in the basin" is not from this outcrop.
 */
export const ModelProvenanceSchema = z.enum([
	"locality", // collected/scanned at this geosite
	"region", // from the same basin/region; exact site unknown
	"illustrative", // representative example only
]);
export type ModelProvenance = z.infer<typeof ModelProvenanceSchema>;

const Model3DBaseSchema = z.object({
	kind: z.enum(["fossil", "strata", "cave", "outcrop", "mineral"]),
	title: z.string().min(1).max(160),
	provenance: ModelProvenanceSchema,
	/** Real-world size of the longest axis, in metres. */
	realWorldSizeM: z.number().positive().optional(),
	license: z.string().min(1).max(64), // SPDX id, or "Sketchfab Standard" for view-only
	attribution: z.string().min(1).max(256),
	/** Page where the model is published (credit link). */
	sourceUrl: z.url().optional(),
	polycount: z.number().int().positive().optional(),
});

/** Self-hosted under `public/models/`, or any HTTPS host with CORS. */
const SelfHostedPath = z
	.string()
	.regex(/^\/models\/[\w.-]+\.(glb|gltf)$/, "must be /models/<file>.glb");

export const GltfModel3DSchema = Model3DBaseSchema.extend({
	provider: z.literal("gltf"),
	format: z.enum(["glb", "gltf"]),
	url: z.union([z.url({ protocol: /^https$/ }), SelfHostedPath]),
	upAxis: z.enum(["y", "z"]).default("y"),
});

/** Rendered with Sketchfab's own embed viewer (for models we may not redistribute). */
export const SketchfabModel3DSchema = Model3DBaseSchema.extend({
	provider: z.literal("sketchfab"),
	uid: z.string().regex(/^[0-9a-f]{32}$/, "Sketchfab model uid"),
});

export const Model3DSchema = z.discriminatedUnion("provider", [
	GltfModel3DSchema,
	SketchfabModel3DSchema,
]);
export type Model3D = z.infer<typeof Model3DSchema>;
export type GltfModel3D = z.infer<typeof GltfModel3DSchema>;

// ---------------------------------------------------------------------------
// Geosite
// ---------------------------------------------------------------------------

const SlugSchema = z
	.string()
	.min(3)
	.max(96)
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "kebab-case only");

/** Fields a client may submit when creating/updating a geosite. */
export const GeositeInputSchema = z.object({
	slug: SlugSchema,
	name: z.string().trim().min(2).max(240),
	summary: z.string().trim().max(500),
	description: z.string().trim().max(20_000).optional(),
	/** UNESCO Global Geopark the site lies in, if any. */
	geoparkId: GeoparkIdSchema.optional(),
	/** Free-text aspiring-geopark proposal from GEOSSIT, when not a UNESCO one. */
	geoparkProposal: z.string().trim().max(160).optional(),
	municipality: z.string().trim().min(2).max(120),
	state: z.string().length(2).toUpperCase(),
	categories: z.array(GeositeCategorySchema).max(GEOSITE_CATEGORIES.length),
	relevance: RelevanceSchema,
	scores: GeositeScoresSchema.optional(),
	degradationRisk: DegradationRiskSchema.optional(),
	geology: z
		.object({
			setting: z.string().max(200).optional(), // "enquadramento geológico"
			province: z.string().max(200).optional(), // "província geológica"
		})
		.optional(),
	geologicAge: GeologicAgeSchema.optional(),
	source: GeositeSourceSchema.optional(),
	location: GeoPointSchema,
	/** Fossil/strata/cave models shown in the 3D viewer. */
	models: z.array(Model3DSchema).max(20).default([]),
	coverImageUrl: z.url().optional(),
	/** Some caves and fossil beds must not be pinpointed publicly. */
	locationIsSensitive: z.boolean().default(false),
});
export type GeositeInput = z.input<typeof GeositeInputSchema>;

/** A geosite as returned by the API (the DTO). `_id` never leaves the server. */
export const GeositeSchema = GeositeInputSchema.extend({
	id: z.string(),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});
export type Geosite = z.infer<typeof GeositeSchema>;

export const GeositeWithDistanceSchema = GeositeSchema.extend({
	distanceMeters: z.number().nonnegative(),
});
export type GeositeWithDistance = z.infer<typeof GeositeWithDistanceSchema>;

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const NearbyGeositesQuerySchema = z.object({
	lng: LongitudeSchema,
	lat: LatitudeSchema,
	radiusKm: z.number().positive().max(1_000).default(250),
	categories: z.array(GeositeCategorySchema).optional(),
	limit: z.number().int().min(1).max(200).default(50),
});
export type NearbyGeositesQuery = z.input<typeof NearbyGeositesQuerySchema>;

/** Default map centre: Chapada do Araripe, Brazil's first UNESCO Global Geopark. */
export const DEFAULT_CENTER = { lng: -39.6, lat: -7.25 } as const;

export const DrawerTabSchema = z.enum(["overview", "model"]);
export type DrawerTab = z.infer<typeof DrawerTabSchema>;

/** URL search params for the explorer route (coerced, since URLs are strings). */
export const ExplorerSearchSchema = z.object({
	lng: z.coerce.number().pipe(LongitudeSchema).catch(DEFAULT_CENTER.lng),
	lat: z.coerce.number().pipe(LatitudeSchema).catch(DEFAULT_CENTER.lat),
	radiusKm: z.coerce.number().positive().max(1_000).catch(250),
	site: SlugSchema.optional().catch(undefined),
	/** Drawer tab; omitted means "overview". */
	tab: DrawerTabSchema.optional().catch(undefined),
	/** Index into the geosite's `models`; omitted means 0. */
	model: z.coerce.number().int().nonnegative().optional().catch(undefined),
});
export type ExplorerSearch = z.infer<typeof ExplorerSearchSchema>;

/** The "search around a point" form in the sidebar. */
export const LocationFormSchema = NearbyGeositesQuerySchema.pick({
	lng: true,
	lat: true,
}).extend({ radiusKm: z.number().positive().max(1_000) });
export type LocationFormValues = z.infer<typeof LocationFormSchema>;
