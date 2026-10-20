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
