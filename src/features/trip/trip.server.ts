/** Server-only lookup behind shared trip links (`/trip?stops=…`). */
import {
	geositesCollection,
	publicPoint,
} from "~/features/geosites/geosites.server";
import type { GeoparkId } from "~/features/geosites/schemas";
import type { TripStop } from "./schemas";

/** The geosites named by `slugs`, in that order, with public points only. */
export async function findTripStops(slugs: string[]): Promise<TripStop[]> {
	const docs = await (await geositesCollection())
		.find(
			{ slug: { $in: slugs } },
			{
				projection: {
					slug: 1,
					name: 1,
					municipality: 1,
					state: 1,
					geoparkId: 1,
					location: 1,
					locationIsSensitive: 1,
				},
			},
		)
		.toArray();
	const bySlug = new Map(docs.map((d) => [d.slug, d]));
	return slugs.flatMap((slug): TripStop[] => {
		const d = bySlug.get(slug);
		if (!d) return [];
		return [
			{
				slug: d.slug,
				name: d.name,
				municipality: d.municipality,
				state: d.state,
				...(d.geoparkId && { geoparkId: d.geoparkId as GeoparkId }),
				point: publicPoint(d),
				approximate: d.locationIsSensitive,
			},
		];
	});
}
