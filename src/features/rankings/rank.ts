/** Pure ordering for the rankings page. */
import type { RankedGeosite, ScoredGeosite, ScoreKey } from "./schemas";

/**
 * Highest score first, then by name; equal scores share a rank (1, 1, 3).
 * Only the first `limit` are returned, so a tie may continue past the cut.
 */
export function rankBy(
	rows: ScoredGeosite[],
	by: ScoreKey,
	limit: number,
): RankedGeosite[] {
	const sorted = [...rows].sort(
		(a, b) => b.scores[by] - a.scores[by] || a.name.localeCompare(b.name, "pt"),
	);
	let rank = 0;
	return sorted.slice(0, limit).map((row, i) => {
		if (i === 0 || row.scores[by] !== sorted[i - 1]?.scores[by]) rank = i + 1;
		return { ...row, rank };
	});
}
