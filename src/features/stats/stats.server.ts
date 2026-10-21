/** Server-only reads for the numbers, timeline and comparison pages. */
import { listFossilGenera } from "~/features/fossils/fossils.server";
import { geositesCollection } from "~/features/geosites/geosites.server";
import type { GeositeStats, StatsRow, Timeline } from "./schemas";
import { geositeStats, timeline } from "./stats";

/** Every geosite's labels and age range; no coordinates leave this query. */
async function statsRows(): Promise<StatsRow[]> {
	const col = await geositesCollection();
	const docs = await col
		.find(
			{},
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
					geologicAge: 1,
				},
			},
		)
		.toArray();
	return docs.map(({ geologicAge, ...rest }) => ({
		slug: rest.slug,
		name: rest.name,
		municipality: rest.municipality,
		state: rest.state,
		categories: rest.categories,
		relevance: rest.relevance,
		geoparkId: rest.geoparkId,
		minMa: geologicAge?.minMa,
		maxMa: geologicAge?.maxMa,
	}));
}

export async function loadGeositeStats(): Promise<GeositeStats> {
	const [rows, genera] = await Promise.all([statsRows(), listFossilGenera()]);
	return geositeStats(rows, genera);
}

export async function loadTimeline(): Promise<Timeline> {
	return timeline(await statsRows());
}
