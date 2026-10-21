/** Server-only reads for the rankings page. */
import type { Filter } from "mongodb";
import {
	type GeositeDoc,
	geositesCollection,
} from "~/features/geosites/geosites.server";
import { rankBy } from "./rank";
import {
	RANKING_SIZE,
	type Rankings,
	type RankingsQuery,
	RankingsQuerySchema,
	type ScoredGeosite,
} from "./schemas";

/** The top geosites by one GEOSSIT score, optionally in a geopark or state. */
export async function findRankings(input: RankingsQuery): Promise<Rankings> {
	const { by, gp, uf } = RankingsQuerySchema.parse(input);
	const col = await geositesCollection();
	const scored: Filter<GeositeDoc> = {
		"scores.scientific": { $type: "number" },
	};
	const [rows, states] = await Promise.all([
		col
			.find<ScoredGeosite>(
				{
					...scored,
					...(gp && { geoparkId: gp }),
					...(uf && { state: uf }),
				},
				{
					projection: {
						_id: 0,
						slug: 1,
						name: 1,
						municipality: 1,
						state: 1,
						geoparkId: 1,
						scores: 1,
					},
				},
			)
			.toArray(),
		col.distinct("state", scored),
	]);
	return {
		items: rankBy(rows, by, RANKING_SIZE),
		total: rows.length,
		states: states.sort(),
	};
}
