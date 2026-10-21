/** A printable field guide: geosites with what to read on site. Isomorphic. */
import { z } from "zod";
import {
	GeoparkIdSchema,
	GeositeSchema,
	PositionSchema,
	SlugSchema,
} from "~/features/geosites/schemas";
import { MAX_TRIP_STOPS } from "~/features/trip/schemas";
import { locales } from "~/lib/i18n";

export const GuideEntrySchema = GeositeSchema.pick({
	slug: true,
	name: true,
	municipality: true,
	state: true,
	geoparkId: true,
	categories: true,
	relevance: true,
	geologicAge: true,
}).extend({
	/** The full description, or the summary when GEOSSIT has none. */
	text: z.string(),
	/** Public point: rounded ~1 km for sensitive geosites. */
	point: PositionSchema,
	approximate: z.boolean(),
	/** The geosite's GEOSSIT record. */
	sourceUrl: z.url().optional(),
	/** Absolute URL of the geosite page, in the guide's language. */
	pageUrl: z.url(),
	/** QR code for `pageUrl`, as SVG markup generated on the server. */
	qrSvg: z.string(),
});
export type GuideEntry = z.infer<typeof GuideEntrySchema>;

const LocaleSchema = z.enum(locales);

export const GuideBySlugsSchema = z.object({
	slugs: z.array(SlugSchema).min(1).max(MAX_TRIP_STOPS),
	locale: LocaleSchema,
});

export const GuideByGeoparkSchema = z.object({
	id: GeoparkIdSchema,
	locale: LocaleSchema,
});
