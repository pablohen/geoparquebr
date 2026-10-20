/**
 * Geology data looked up around a geosite from public APIs (SGB, GBIF).
 * Isomorphic: shared by server functions and UI.
 */
import { z } from "zod";

/** Each upstream source succeeds or fails on its own. */
export const sourceResult = <T extends z.ZodType>(item: T) =>
	z.discriminatedUnion("status", [
		z.object({
			status: z.literal("ok"),
			items: z.array(item),
			/** Total matches upstream, when larger than `items`. */
			total: z.number().int().nonnegative(),
		}),
		z.object({ status: z.literal("unavailable") }),
	]);

// ---------------------------------------------------------------------------
// Fossil occurrences
// ---------------------------------------------------------------------------

export const FossilSourceSchema = z.enum(["sgb", "gbif"]);
export type FossilSource = z.infer<typeof FossilSourceSchema>;

export const FOSSIL_SOURCE_LABELS = {
	sgb: "SGB/CPRM",
	gbif: "GBIF",
} as const satisfies Record<FossilSource, string>;

export const FossilOccurrenceSchema = z.object({
	source: FossilSourceSchema,
	id: z.string(),
	/** Taxa as recorded (may include authorship, e.g. "Dastilbe Jordan, 1910"). */
	taxa: z.array(z.string()).min(1),
	/** Lithostratigraphic unit, e.g. "Membro Crato, Formação Santana". */
	unit: z.string().optional(),
	/** Chronostratigraphic age as recorded, e.g. "Aptiano, Cretáceo Inferior". */
	age: z.string().optional(),
	lithology: z.string().optional(),
	locality: z.string().optional(),
	institution: z.string().optional(),
	/** Specimen/catalogue number. */
	specimen: z.string().optional(),
	/** Type status, e.g. "Holótipo". */
	typeStatus: z.string().optional(),
	reference: z.string().optional(),
	url: z.url().optional(),
	license: z.string().optional(),
	/** From the geosite; rounded to whole km for sensitive geosites. */
	distanceKm: z.number().nonnegative(),
});
export type FossilOccurrence = z.infer<typeof FossilOccurrenceSchema>;

export const FOSSIL_SEARCH_RADIUS_KM = 5;

export const GeositeFossilsSchema = z.object({
	radiusKm: z.number().positive(),
	sgb: sourceResult(FossilOccurrenceSchema),
	gbif: sourceResult(FossilOccurrenceSchema),
});
export type GeositeFossils = z.infer<typeof GeositeFossilsSchema>;

// ---------------------------------------------------------------------------
// Lithostratigraphy
// ---------------------------------------------------------------------------

export const StrataUnitSchema = z.object({
	code: z.string(), // "sigla", e.g. "K1s"
	name: z.string(),
	rank: z.string().optional(), // "hierarquia": Grupo, Formação, Unidade…
	minMa: z.number().nonnegative().optional(),
	maxMa: z.number().nonnegative().optional(),
	/** Geological period(s) as recorded, e.g. "Cretáceo". */
	period: z.string().optional(),
	lithology: z.string().optional(), // "litotipos"
	description: z.string().optional(), // "legenda"
});
export type StrataUnit = z.infer<typeof StrataUnitSchema>;

export const STRATA_SEARCH_RADIUS_KM = 3;

/** Units ordered youngest (top) → oldest (base). */
export const GeositeStrataSchema = z.discriminatedUnion("status", [
	z.object({
		status: z.literal("ok"),
		/** Map scale denominator the units come from, e.g. 1_000_000. */
		scale: z.number().int().positive(),
		radiusKm: z.number().positive(),
		units: z.array(StrataUnitSchema),
	}),
	z.object({ status: z.literal("unavailable") }),
]);
export type GeositeStrata = z.infer<typeof GeositeStrataSchema>;

/** Units mapped at a clicked point, at the same scale as the map layer. */
export const GeologyAtPointSchema = z.discriminatedUnion("status", [
	z.object({
		status: z.literal("ok"),
		scale: z.number().int().positive(),
		units: z.array(StrataUnitSchema),
	}),
	z.object({ status: z.literal("unavailable") }),
]);
export type GeologyAtPoint = z.infer<typeof GeologyAtPointSchema>;

/** The map layer shows SGB's 1:1,000,000 lithostratigraphy (full coverage of Brazil). */
export const GEOLOGY_LAYER_SCALE = 1_000_000;
