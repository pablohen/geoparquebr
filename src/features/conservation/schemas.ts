/** The conservation page. Isomorphic. */
import { z } from "zod";
import {
	DegradationRiskSchema,
	GeositeSchema,
} from "~/features/geosites/schemas";

export const AtRiskGeositeSchema = GeositeSchema.pick({
	slug: true,
	name: true,
	municipality: true,
	state: true,
	geoparkId: true,
	locationIsSensitive: true,
}).extend({ vulnerability: z.number().int().optional() });
export type AtRiskGeosite = z.infer<typeof AtRiskGeositeSchema>;

export const ConservationSchema = z.object({
	/** Low → high, zeros kept. */
	risks: z.array(
		z.object({ key: DegradationRiskSchema, count: z.number().int() }),
	),
	/** High degradation risk, most vulnerable first; no coordinates. */
	high: z.array(AtRiskGeositeSchema),
	total: z.number().int(),
});
export type Conservation = z.infer<typeof ConservationSchema>;

export const CONSERVATION_PATH = "/conservation";
