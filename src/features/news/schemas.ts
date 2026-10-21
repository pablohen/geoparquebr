/** What each GEOSSIT sync changed, for the "Novidades" page and feed. */
import { z } from "zod";
import { SlugSchema } from "~/features/geosites/schemas";

/** Fields a reader would care about; internal ones (models, slug) are left out. */
export const CHANGE_FIELDS = [
	"name",
	"description",
	"location",
	"municipality",
	"categories",
	"relevance",
	"scores",
	"degradationRisk",
	"geology",
	"geologicAge",
	"geopark",
	"photo",
] as const;
export const ChangeFieldSchema = z.enum(CHANGE_FIELDS);
export type ChangeField = z.infer<typeof ChangeFieldSchema>;

const RefSchema = z.object({ slug: SlugSchema, name: z.string() });

export const SyncChangesSchema = z.object({
	added: z.array(RefSchema),
	changed: z.array(
		RefSchema.extend({ fields: z.array(ChangeFieldSchema).min(1) }),
	),
	/** Removed geosites have no page any more; only the name is kept. */
	removed: z.array(z.object({ name: z.string() })),
});
export type SyncChanges = z.infer<typeof SyncChangesSchema>;

export const ChangeRunSchema = SyncChangesSchema.extend({
	id: z.string(),
	at: z.iso.datetime(),
});
export type ChangeRun = z.infer<typeof ChangeRunSchema>;

export const NEWS_PATH = "/news";
export const NEWS_FEED_PATH = "/news.xml";
