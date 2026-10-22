/** Server-only: today's featured geosite. */
import { geositesCollection } from "~/features/geosites/geosites.server";
import { dayKey, pickOfTheDay } from "./daily";
import type { DailyGeosite } from "./schemas";

/**
 * The day's geosite, from those with a photo (they make the best feature);
 * any geosite if none has one. Reads no coordinates.
 */
export async function findGeositeOfTheDay(
	now = new Date(),
): Promise<DailyGeosite | null> {
	const col = await geositesCollection();
	const day = dayKey(now);
	const withPhoto: string[] = await col.distinct("slug", {
		coverImageUrl: { $exists: true },
	});
	const slug =
		pickOfTheDay(withPhoto, day) ??
		pickOfTheDay(await col.distinct("slug"), day);
	if (!slug) return null;
	const doc = await col.findOne(
		{ slug },
		{
			projection: {
				_id: 0,
				slug: 1,
				name: 1,
				municipality: 1,
				state: 1,
				geoparkId: 1,
				summary: 1,
			},
		},
	);
	return doc
		? {
				day,
				slug: doc.slug,
				name: doc.name,
				municipality: doc.municipality,
				state: doc.state,
				geoparkId: doc.geoparkId,
				summary: doc.summary,
			}
		: null;
}
