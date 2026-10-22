/** The GEOSSIT data-quality page. Isomorphic. */
import { z } from "zod";

export const QUALITY_PATH = "/data-quality";

/** What the page checks, in the order it lists them. */
export const ISSUE_KINDS = [
	"placeholder",
	"outside-state",
	"photo-dead",
	"photo-missing",
	"no-scores",
	"no-summary",
	"no-theme",
] as const;
export const IssueKindSchema = z.enum(ISSUE_KINDS);
export type IssueKind = z.infer<typeof IssueKindSchema>;

/** One geosite with something to fix upstream; no coordinates. */
export const QualityRowSchema = z.object({
	slug: z.string(),
	name: z.string(),
	municipality: z.string(),
	state: z.string(),
	/** Its GEOSSIT record, where corrections are made. */
	sourceUrl: z.url().optional(),
	issues: z.array(IssueKindSchema).min(1),
});
export type QualityRow = z.infer<typeof QualityRowSchema>;

export const DataQualitySchema = z.object({
	total: z.number().int().nonnegative(),
	checkedAt: z.iso.datetime(),
	/** Photo links that didn't answer in time; neither ok nor dead. */
	photosUnchecked: z.number().int().nonnegative(),
	counts: z.record(IssueKindSchema, z.number().int().nonnegative()),
	/** By name. */
	rows: z.array(QualityRowSchema),
});
export type DataQuality = z.infer<typeof DataQualitySchema>;
