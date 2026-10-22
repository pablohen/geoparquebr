/** Two geosites side by side. Isomorphic. */
import { z } from "zod";
import type { GeositeScores } from "~/features/geosites/schemas";
import { SlugSchema } from "~/features/geosites/schemas";

export const COMPARE_GEOSITES_PATH = "/compare";

/** `/compare?a=…&b=…`; either may be missing while the visitor picks. */
export const CompareSearchSchema = z.object({
	a: SlugSchema.optional().catch(undefined),
	b: SlugSchema.optional().catch(undefined),
});
export type CompareSearch = z.infer<typeof CompareSearchSchema>;

/**
 * Which side a score favours, for bold type: the higher one, except for
 * vulnerability, where higher is worse and neither is highlighted.
 */
export function scoreLeader(
	key: keyof GeositeScores,
	a: number | undefined,
	b: number | undefined,
): "a" | "b" | null {
	if (key === "vulnerability" || a === undefined || b === undefined || a === b)
		return null;
	return a > b ? "a" : "b";
}
