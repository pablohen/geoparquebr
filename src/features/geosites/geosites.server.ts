/**
 * Server-only Mongo access for geosites. Never import this from client code;
 * go through `geosites.functions.ts` instead.
 */
import type { Collection, Filter, ObjectId } from "mongodb";
import { getDb } from "~/lib/db.server";
import {
	type Geosite,
	type GeositeWithDistance,
	type NearbyGeositesQuery,
	NearbyGeositesQuerySchema,
} from "./schemas";

/** Shape persisted in Mongo: the DTO minus `id`, plus `_id` and real Dates. */
export type GeositeDoc = Omit<Geosite, "id" | "createdAt" | "updatedAt"> & {
	_id: ObjectId;
	createdAt: Date;
	updatedAt: Date;
};

export const GEOSITES_COLLECTION = "geosites";

export async function geositesCollection(): Promise<Collection<GeositeDoc>> {
	const db = await getDb();
	return db.collection<GeositeDoc>(GEOSITES_COLLECTION);
}

/** Idempotent; run from `scripts/seed.ts` or a deploy hook, not per request. */
export async function ensureGeositeIndexes(col: Collection<GeositeDoc>) {
	await col.createIndexes([
		{ key: { location: "2dsphere" }, name: "location_2dsphere" },
		{ key: { slug: 1 }, name: "slug_unique", unique: true },
		{ key: { geoparkId: 1, categories: 1 }, name: "geopark_categories" },
	]);
}

/** Rounds to ~1.1 km so sensitive caves/fossil beds can't be pinpointed. */
function obfuscate([lng, lat]: [number, number]): [number, number] {
	return [Math.round(lng * 100) / 100, Math.round(lat * 100) / 100];
}

function toDto<T extends GeositeDoc>(
	doc: T,
): Omit<T, "_id" | "createdAt" | "updatedAt"> & {
	id: string;
	createdAt: string;
	updatedAt: string;
} {
	const { _id, createdAt, updatedAt, ...rest } = doc;
	const location = rest.locationIsSensitive
		? { ...rest.location, coordinates: obfuscate(rest.location.coordinates) }
		: rest.location;
	return {
		...rest,
		location,
		id: _id.toHexString(),
		createdAt: createdAt.toISOString(),
		updatedAt: updatedAt.toISOString(),
	};
}

/**
 * Geosites ordered by distance from a point.
 *
 * Uses `$geoNear` rather than a `find({ location: { $near } })` because the
 * aggregation stage also returns the computed distance, which the UI shows.
 * `$geoNear` must be the first stage and requires the 2dsphere index.
 */
export async function findGeositesNear(
	input: NearbyGeositesQuery,
): Promise<GeositeWithDistance[]> {
	const { lng, lat, radiusKm, categories, limit } =
		NearbyGeositesQuerySchema.parse(input);
	const col = await geositesCollection();

	const query: Filter<GeositeDoc> = categories?.length
		? { categories: { $in: categories } }
		: {};

	const docs = await col
		.aggregate<GeositeDoc & { distanceMeters: number }>([
			{
				$geoNear: {
					near: { type: "Point", coordinates: [lng, lat] },
					key: "location",
					spherical: true,
					distanceField: "distanceMeters",
					maxDistance: radiusKm * 1_000,
					query,
				},
			},
			{ $limit: limit },
		])
		.toArray();

	return docs.map(toDto);
}

export async function findGeositeBySlug(slug: string): Promise<Geosite | null> {
	const col = await geositesCollection();
	const doc = await col.findOne({ slug });
	return doc ? toDto(doc) : null;
}
