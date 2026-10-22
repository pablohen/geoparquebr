/**
 * "Parecidos": geosites in other states that share a geosite's themes and
 * geological periods. Pure, so the scoring can be tested without a database.
 */

import type { GeologicPeriodId } from "~/features/geology/time-scale";
import { periodsOf } from "~/features/stats/stats";
import type { GeositeCategory } from "./schemas";

export type SimilarCandidate = {
	slug: string;
	name: string;
	municipality: string;
	state: string;
	categories: GeositeCategory[];
	minMa?: number;
	maxMa?: number;
};

export type SimilarMatch = Omit<SimilarCandidate, "minMa" | "maxMa"> & {
	/** The themes it shares with the geosite. */
	categories: GeositeCategory[];
	periods: GeologicPeriodId[];
};

export const SIMILAR_LIMIT = 5;

/**
 * A shared theme counts twice as much as a shared period; at least one theme
 * must match. Geosites in the same state are left to "Perto daqui".
 */
export function similarTo(
	target: SimilarCandidate,
	candidates: SimilarCandidate[],
	limit = SIMILAR_LIMIT,
): SimilarMatch[] {
	const themes = new Set(target.categories);
	const periods = new Set(periodsOf(target));
	return candidates
		.filter((c) => c.slug !== target.slug && c.state !== target.state)
		.map(({ minMa, maxMa, ...c }) => {
			const sharedThemes = c.categories.filter((t) => themes.has(t));
			const sharedPeriods = periodsOf({ minMa, maxMa }).filter((p) =>
				periods.has(p),
			);
			return {
				match: { ...c, categories: sharedThemes, periods: sharedPeriods },
				score: sharedThemes.length * 2 + sharedPeriods.length,
			};
		})
		.filter((x) => x.match.categories.length > 0)
		.sort(
			(a, b) =>
				b.score - a.score || a.match.name.localeCompare(b.match.name, "pt"),
		)
		.slice(0, limit)
		.map((x) => x.match);
}
