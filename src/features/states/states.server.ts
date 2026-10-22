/** Server-only reads for the state pages. */
import { generaNearGeosites } from "~/features/fossils/fossils.server";
import { geositesCollection } from "~/features/geosites/geosites.server";
import type { GeoparkId, Geosite } from "~/features/geosites/schemas";
import { rankBy } from "~/features/rankings/rank";
import { tally } from "~/features/stats/stats";
import { frameAround } from "./frame";
import { type StatePage, TOP_IN_STATE } from "./schemas";
import type { Uf } from "./states";

type Row = Pick<
	Geosite,
	| "slug"
	| "name"
	| "municipality"
	| "state"
	| "categories"
	| "relevance"
	| "geoparkId"
	| "scores"
	| "geologicAge"
> & { publicLocation: Geosite["location"] };

/**
 * A state's geosites, counts, top scientific values and fossil genera, or
 * null when it has none. Only public (rounded) points are read, to frame
 * the map; exact coordinates never leave the database.
 */
export async function findStatePage(uf: Uf): Promise<StatePage | null> {
	const col = await geositesCollection();
	const rows = await col
		.find<Row>(
			{ state: uf },
			{
				projection: {
					_id: 0,
					slug: 1,
					name: 1,
					municipality: 1,
					state: 1,
					categories: 1,
					relevance: 1,
					geoparkId: 1,
					scores: 1,
					geologicAge: 1,
					publicLocation: 1,
				},
			},
		)
		.toArray();
	const bbox = frameAround(rows.map((r) => r.publicLocation.coordinates));
	if (!bbox) return null;

	const byName = [...rows].sort((a, b) => a.name.localeCompare(b.name, "pt"));
	const scored = rows.flatMap(({ scores, ...r }) =>
		scores ? [{ ...r, scores }] : [],
	);
	return {
		uf,
		tally: tally(
			rows.map((r) => ({
				...r,
				minMa: r.geologicAge?.minMa,
				maxMa: r.geologicAge?.maxMa,
			})),
		),
		bbox,
		geosites: byName.map(
			({ slug, name, municipality, relevance, geoparkId }) => ({
				slug,
				name,
				municipality,
				relevance,
				geoparkId,
			}),
		),
		top: rankBy(
			scored.map(({ slug, name, municipality, state, geoparkId, scores }) => ({
				slug,
				name,
				municipality,
				state,
				geoparkId,
				scores,
			})),
			"scientific",
			TOP_IN_STATE,
		),
		geoparks: [
			...new Set(rows.flatMap((r) => (r.geoparkId ? [r.geoparkId] : []))),
		].sort() as GeoparkId[],
		genera: await generaNearGeosites(rows.map((r) => r.slug)),
	};
}
