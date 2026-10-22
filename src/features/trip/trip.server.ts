/** Server-only lookup behind shared trip links (`/trip?stops=…`). */
import {
	geositesCollection,
	publicPoint,
} from "~/features/geosites/geosites.server";
import type { GeoparkId } from "~/features/geosites/schemas";
import { type Itineraries, suggestItineraries } from "./itineraries";
import type { ItinerariesQuery, TripStop } from "./schemas";

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
					locationIsApproximate: 1,
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
				approximate: d.locationIsSensitive || !!d.locationIsApproximate,
			},
		];
	});
}

/**
 * Suggested 1- and 2-day itineraries in a geopark or a state, from the
 * geosites' tourism marks and public points.
 */
export async function findItineraries(
	query: ItinerariesQuery,
): Promise<Itineraries> {
	const docs = await (await geositesCollection())
		.find(
			{
				"scores.tourism": { $type: "number" },
				// A municipality's centre would send visitors to the wrong place.
				locationIsApproximate: { $ne: true },
				...("gp" in query ? { geoparkId: query.gp } : { state: query.uf }),
			},
			{
				projection: {
					slug: 1,
					name: 1,
					municipality: 1,
					state: 1,
					geoparkId: 1,
					location: 1,
					locationIsSensitive: 1,
					locationIsApproximate: 1,
					scores: 1,
				},
			},
		)
		.toArray();
	return suggestItineraries(
		docs.map((d) => ({
			slug: d.slug,
			name: d.name,
			municipality: d.municipality,
			state: d.state,
			...(d.geoparkId && { geoparkId: d.geoparkId as GeoparkId }),
			point: publicPoint(d),
			approximate: d.locationIsSensitive || !!d.locationIsApproximate,
			tourism: d.scores?.tourism ?? 0,
		})),
	);
}
