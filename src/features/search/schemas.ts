import { z } from "zod";
import { BBoxSchema } from "../geosites/schemas";

export const SearchQuerySchema = z.object({
	q: z.string().trim().min(2).max(100),
});

export const PlaceSchema = z.object({
	id: z.string(),
	name: z.string(),
	/** Municipality/state context, e.g. "Lençóis, Bahia". */
	context: z.string().optional(),
	/** OSM value, e.g. "city", "nature_reserve". */
	kind: z.string().optional(),
	point: z.tuple([z.number(), z.number()]),
	bbox: BBoxSchema.optional(),
});
export type Place = z.infer<typeof PlaceSchema>;
