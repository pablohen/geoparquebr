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

export const GEOSITE_CATEGORIES = [
	"paleontological",
	"geomorphological",
	"speleological",
	"stratigraphic",
	"mineralogical",
	"petrological",
	"hydrogeological",
	"tectonic",
] as const;

export const GeositeCategorySchema = z.enum(GEOSITE_CATEGORIES);
export type GeositeCategory = z.infer<typeof GeositeCategorySchema>;

export const GEOSITE_CATEGORY_LABELS = {
	paleontological: "Paleontológico",
	geomorphological: "Geomorfológico",
	speleological: "Espeleológico (carste)",
	stratigraphic: "Estratigráfico",
	mineralogical: "Mineralógico",
	petrological: "Petrológico",
	hydrogeological: "Hidrogeológico",
	tectonic: "Tectônico",
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

export const ScientificValueSchema = z.enum([
	"international",
	"national",
	"regional",
	"local",
]);
export type ScientificValue = z.infer<typeof ScientificValueSchema>;

export const SCIENTIFIC_VALUE_LABELS = {
	international: "Internacional",
	national: "Nacional",
	regional: "Regional",
	local: "Local",
} as const satisfies Record<ScientificValue, string>;

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

export const Model3DSchema = z.object({
	kind: z.enum(["fossil", "strata", "cave", "outcrop", "mineral"]),
	title: z.string().min(1).max(120),
	format: z.enum(["glb", "gltf"]),
	url: z.url({ protocol: /^https$/ }),
	/** Optional Draco/meshopt-compressed variant for low-bandwidth clients. */
	lodUrl: z.url({ protocol: /^https$/ }).optional(),
	previewImageUrl: z.url().optional(),
	/** Real-world size of the longest axis, in metres — lets the viewer show a scale bar. */
	realWorldSizeM: z.number().positive().optional(),
	upAxis: z.enum(["y", "z"]).default("y"),
	license: z.string().min(1).max(64), // SPDX or "CC-BY-4.0" etc.
	attribution: z.string().min(1).max(256),
	polycount: z.number().int().positive().optional(),
});
export type Model3D = z.infer<typeof Model3DSchema>;

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
	name: z.string().trim().min(2).max(160),
	summary: z.string().trim().max(500),
	description: z.string().trim().max(20_000).optional(),
	geoparkId: GeoparkIdSchema,
	municipality: z.string().trim().min(2).max(120),
	state: z.string().length(2).toUpperCase(),
	categories: z
		.array(GeositeCategorySchema)
		.min(1)
		.max(GEOSITE_CATEGORIES.length),
	scientificValue: ScientificValueSchema,
	geologicAge: GeologicAgeSchema.optional(),
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
	radiusKm: z.number().positive().max(1_000).default(150),
	categories: z.array(GeositeCategorySchema).optional(),
	limit: z.number().int().min(1).max(200).default(50),
});
export type NearbyGeositesQuery = z.input<typeof NearbyGeositesQuerySchema>;

/** Default map centre: Chapada do Araripe, Brazil's first UNESCO Global Geopark. */
export const DEFAULT_CENTER = { lng: -39.6, lat: -7.25 } as const;

/** URL search params for the explorer route (coerced, since URLs are strings). */
export const ExplorerSearchSchema = z.object({
	lng: z.coerce.number().pipe(LongitudeSchema).catch(DEFAULT_CENTER.lng),
	lat: z.coerce.number().pipe(LatitudeSchema).catch(DEFAULT_CENTER.lat),
	radiusKm: z.coerce.number().positive().max(1_000).catch(150),
	site: SlugSchema.optional().catch(undefined),
});
export type ExplorerSearch = z.infer<typeof ExplorerSearchSchema>;

/** The "search around a point" form in the sidebar. */
export const LocationFormSchema = NearbyGeositesQuerySchema.pick({
	lng: true,
	lat: true,
}).extend({ radiusKm: z.number().positive().max(1_000) });
export type LocationFormValues = z.infer<typeof LocationFormSchema>;
