/**
 * Server-only geopark queries. Geosites belong to a geopark through GEOSSIT's
 * municipality (see GEOPARK_MUNICIPALITIES in geossit.server.ts).
 */
import {
	geositesCollection,
	publicPoint,
} from "~/features/geosites/geosites.server";
import type { GeoparkId } from "~/features/geosites/schemas";
import type { GeoparkGeosite } from "./schemas";

/** A geopark's geosites, by name, with public (rounded if sensitive) points. */
export async function findGeoparkGeosites(
	id: GeoparkId,
): Promise<GeoparkGeosite[]> {
	const col = await geositesCollection();
	const docs = await col
		.find(
			{ geoparkId: id },
			{
				projection: {
					slug: 1,
					name: 1,
					municipality: 1,
					state: 1,
					categories: 1,
					relevance: 1,
					location: 1,
					locationIsSensitive: 1,
				},
			},
		)
		.sort({ name: 1 })
		.toArray();
	return docs.map(({ _id, location, locationIsSensitive, ...rest }) => ({
		...rest,
		id: _id.toHexString(),
		locationIsSensitive,
		location: {
			...location,
			coordinates: publicPoint({ location, locationIsSensitive }),
		},
	}));
}

/** How many geosites each geopark has; geoparks with none are omitted. */
export async function countGeositesByGeopark(): Promise<
	Partial<Record<GeoparkId, number>>
> {
	const col = await geositesCollection();
	const rows = await col
		.aggregate<{ _id: GeoparkId; n: number }>([
			{ $match: { geoparkId: { $exists: true } } },
			{ $group: { _id: "$geoparkId", n: { $sum: 1 } } },
		])
		.toArray();
	return Object.fromEntries(rows.map((r) => [r._id, r.n]));
}
