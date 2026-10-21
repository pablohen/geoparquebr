/**
 * Server-only Mongo access for geosites. Never import this from client code;
 * go through `geosites.functions.ts` instead.
 */
import type { Collection, Filter, ObjectId } from "mongodb";
import type { z } from "zod";
import { periodRangeMa } from "~/features/geology/time-scale";
import { getDb } from "~/lib/db.server";
import { bboxCenter, bboxPolygon, haversineMeters } from "~/lib/geo";
import {
	type AgeRange,
	type Geosite,
	type GeositeInputSchema,
	type GeositeSearchHit,
	type GeositeSummary,
	type GeositesInBoundsQuery,
	GeositesInBoundsQuerySchema,
} from "./schemas";

/** Shape persisted in Mongo: the DTO minus `id`, plus `_id` and real Dates. */
export type GeositeDoc = Omit<Geosite, "id" | "createdAt" | "updatedAt"> & {
	_id: ObjectId;
	createdAt: Date;
	updatedAt: Date;
	/**
	 * `location` as clients may see it (rounded for sensitive sites). Every
	 * query a client can steer (viewport, nearby) runs on this, so neither
	 * which sites match nor their distances depend on exact coordinates.
	 */
	publicLocation: Geosite["location"];
};

export const GEOSITES_COLLECTION = "geosites";

export async function geositesCollection(): Promise<Collection<GeositeDoc>> {
	const db = await getDb();
	return db.collection<GeositeDoc>(GEOSITES_COLLECTION);
}

/**
 * The search box's text index. No stemming (`default_language: "none"`):
 * MongoDB's Portuguese stemmer cut "serido" down to "ser" ("to be"), which
 * matches nearly every description. Partial and plural input is covered by
 * the substring top-up in `searchGeosites`. Diacritic-insensitive (v3).
 */
const TEXT_INDEX = {
	key: { name: "text", municipality: "text", description: "text" },
	name: "text_search",
	weights: { name: 10, municipality: 5, description: 1 },
	default_language: "none",
} as const;

/** Idempotent; run from `scripts/seed.ts` or a deploy hook, not per request. */
export async function ensureGeositeIndexes(col: Collection<GeositeDoc>) {
	// An index can't change options in place: drop a text index built with
	// another language (the old stemmed one) so it's rebuilt below.
	// listIndexes fails while the collection doesn't exist yet (a first seed).
	const indexes = await col
		.listIndexes()
		.toArray()
		.catch(() => []);
	const existing = indexes.find((i) => i.name === TEXT_INDEX.name);
	if (existing && existing.default_language !== TEXT_INDEX.default_language)
		await col.dropIndex(TEXT_INDEX.name);
	await col.createIndexes([
		{ key: { location: "2dsphere" }, name: "location_2dsphere" },
		{
			key: { publicLocation: "2dsphere" },
			name: "public_location_2dsphere",
		},
		{ key: { slug: 1 }, name: "slug_unique", unique: true },
		{ key: { geoparkId: 1, categories: 1 }, name: "geopark_categories" },
		{
			key: { "source.system": 1, "source.id": 1 },
			name: "source_unique",
			unique: true,
			partialFilterExpression: { "source.id": { $exists: true } },
		},
		{ ...TEXT_INDEX },
	]);
}

/** Optional top-level fields; unset when an upstream record drops them. */
const OPTIONAL_FIELDS = [
	"description",
	"geoparkId",
	"geoparkProposal",
	"scores",
	"degradationRisk",
	"geology",
	"geologicAge",
	"coverImageUrl",
] as const satisfies readonly (keyof GeositeDoc)[];

type ImportedGeosite = z.output<typeof GeositeInputSchema> & {
	source: NonNullable<z.output<typeof GeositeInputSchema>["source"]>;
};

/**
 * Upserts records from an external inventory keyed by `source.{system,id}`,
 * then deletes that system's records that disappeared upstream.
 */
export async function syncSourcedGeosites(
	col: Collection<GeositeDoc>,
	system: "geossit",
	geosites: ImportedGeosite[],
	now = new Date(),
) {
	if (geosites.length === 0)
		throw new Error(`refusing to sync 0 ${system} records`);

	const result = await col.bulkWrite(
		geosites.map((g) => {
			const unset = OPTIONAL_FIELDS.filter((k) => g[k] === undefined);
			return {
				updateOne: {
					filter: { "source.system": system, "source.id": g.source.id },
					update: {
						$set: {
							...g,
							publicLocation: { type: "Point", coordinates: publicPoint(g) },
							updatedAt: now,
						},
						$setOnInsert: { createdAt: now },
						...(unset.length > 0 && {
							$unset: Object.fromEntries(unset.map((k) => [k, ""])),
						}),
					},
					upsert: true,
				},
			};
		}),
		{ ordered: false },
	);

	const pruned = await col.deleteMany({
		"source.system": system,
		"source.id": { $nin: geosites.map((g) => g.source.id) },
	});

	return {
		inserted: result.upsertedCount,
		updated: result.modifiedCount,
		deleted: pruned.deletedCount,
	};
}

/** Rounds to ~1.1 km so sensitive caves/fossil beds can't be pinpointed. */
function obfuscate([lng, lat]: [number, number]): [number, number] {
	return [Math.round(lng * 100) / 100, Math.round(lat * 100) / 100];
}

/** Coordinates as the client may see them: rounded for sensitive sites. */
export function publicPoint(doc: {
	location: { coordinates: [number, number] };
	locationIsSensitive: boolean;
}): [number, number] {
	return doc.locationIsSensitive
		? obfuscate(doc.location.coordinates)
		: doc.location.coordinates;
}

function toDto<T extends GeositeDoc>(
	doc: T,
): Omit<T, "_id" | "createdAt" | "updatedAt" | "publicLocation"> & {
	id: string;
	createdAt: string;
	updatedAt: string;
} {
	const { _id, createdAt, updatedAt, publicLocation: _, ...rest } = doc;
	return {
		...rest,
		location: { ...rest.location, coordinates: publicPoint(rest) },
		id: _id.toHexString(),
		createdAt: createdAt.toISOString(),
		updatedAt: updatedAt.toISOString(),
	};
}

const SUMMARY_FIELDS = {
	_id: 1,
	slug: 1,
	name: 1,
	municipality: 1,
	state: 1,
	categories: 1,
	relevance: 1,
	geoparkId: 1,
	location: 1,
	locationIsSensitive: 1,
	distanceMeters: 1,
} as const;

export type SummaryDoc = Pick<
	GeositeDoc,
	Exclude<keyof typeof SUMMARY_FIELDS, "distanceMeters">
> & {
	distanceMeters: number;
};

/**
 * Mongo condition: the geosite's dated age range overlaps the periods. Ranges
 * that merely touch (Cretaceous ends where the Paleogene starts) don't count.
 */
export function ageOverlaps(range: AgeRange): Filter<GeositeDoc> {
	const [young, old] = periodRangeMa(range);
	return {
		"geologicAge.maxMa": { $gt: young },
		"geologicAge.minMa": Number.isFinite(old)
			? { $lt: old }
			: { $exists: true },
	};
}

/**
 * Geosites inside a map viewport, nearest to its centre first.
 *
 * `$geoNear` (first stage, needs the 2dsphere index) gives the distance and
 * the ordering; its `query` restricts results to the box via `$geoWithin`.
 * Both use `publicLocation`: on exact coordinates, tiny boxes or distances
 * from chosen centres would locate a sensitive site to the metre.
 * Only summary fields are returned; the drawer fetches the full record.
 */
export async function findGeositesInBounds(
	input: GeositesInBoundsQuery,
): Promise<GeositeSummary[]> {
	const { bbox, categories, relevance, geoparkId, age, limit } =
		GeositesInBoundsQuerySchema.parse(input);
	const col = await geositesCollection();

	const query: Filter<GeositeDoc> = {
		publicLocation: { $geoWithin: { $geometry: bboxPolygon(bbox) } },
		...(categories?.length && { categories: { $in: categories } }),
		...(relevance && { relevance }),
		...(geoparkId && { geoparkId }),
		...(age && ageOverlaps(age)),
	};

	const docs = await col
		.aggregate<SummaryDoc>([
			{
				$geoNear: {
					near: { type: "Point", coordinates: bboxCenter(bbox) },
					key: "publicLocation",
					spherical: true,
					distanceField: "distanceMeters",
					query,
				},
			},
			{ $limit: limit },
			{ $project: SUMMARY_FIELDS },
		])
		.toArray();

	return docs.map(({ _id, ...rest }) => ({
		...rest,
		id: _id.toHexString(),
		location: { ...rest.location, coordinates: publicPoint(rest) },
	}));
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const stripAccents = (s: string) =>
	s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");

/**
 * Free-text search for the search box. MongoDB text search matches whole,
 * unstemmed words only, so a case-insensitive substring match on name,
 * municipality and abstract tops it up for partial input like "ptero".
 * GEOSSIT text is mostly unaccented, hence the accent stripping.
 */
export async function searchGeosites(
	q: string,
	limit = 8,
): Promise<GeositeSearchHit[]> {
	const col = await geositesCollection();
	const projection = {
		_id: 0,
		slug: 1,
		name: 1,
		municipality: 1,
		state: 1,
		categories: 1,
	} as const;

	const byText = await col
		.find(
			{ $text: { $search: q } },
			{ projection: { ...projection, score: { $meta: "textScore" } } },
		)
		.sort({ score: { $meta: "textScore" } })
		.limit(limit)
		.toArray();

	const seen = new Set(byText.map((d) => d.slug));
	const pattern = escapeRegex(stripAccents(q.trim()));
	const byName =
		byText.length < limit
			? await col
					.find(
						{
							slug: { $nin: [...seen] },
							$or: (["name", "municipality", "description"] as const).map(
								(field) => ({
									[field]: { $regex: pattern, $options: "i" },
								}),
							),
						},
						{ projection },
					)
					.limit(limit - byText.length)
					.toArray()
			: [];

	return [...byText, ...byName].map(
		({ slug, name, municipality, state, categories }) => ({
			slug,
			name,
			municipality,
			state,
			categories,
		}),
	);
}

/**
 * Exact coordinates for server-side lookups (fossils, strata). Never return
 * these to the client: sensitive geosites are only exposed rounded.
 */
export async function findGeositeLocation(
	slug: string,
): Promise<{ point: [number, number]; sensitive: boolean } | null> {
	const col = await geositesCollection();
	const doc = await col.findOne(
		{ slug },
		{ projection: { location: 1, locationIsSensitive: 1 } },
	);
	return doc
		? { point: doc.location.coordinates, sensitive: doc.locationIsSensitive }
		: null;
}

/** How many nearby geosites to fetch around one geosite, and how far out. */
const NEARBY_CANDIDATES = 20;
const NEARBY_MAX_METERS = 300_000;

/**
 * Ranks candidates by distance between *public* coordinates, rounded to
 * 100 m. Distances measured from or to an exact sensitive location would let
 * a client triangulate it from a few pages, so they never are.
 */
export function rankNearby(
	origin: [number, number],
	candidates: SummaryDoc[],
	limit: number,
): GeositeSummary[] {
	return candidates
		.map(({ _id, distanceMeters: _, ...rest }) => {
			const point = publicPoint(rest);
			return {
				...rest,
				id: _id.toHexString(),
				location: { ...rest.location, coordinates: point },
				distanceMeters: Math.round(haversineMeters(origin, point) / 100) * 100,
			};
		})
		.sort(
			(a, b) =>
				a.distanceMeters - b.distanceMeters || a.name.localeCompare(b.name),
		)
		.slice(0, limit);
}

/** The geosites closest to one geosite (itself excluded), within 300 km. */
export async function findNearbyGeosites(
	slug: string,
	limit = 6,
): Promise<GeositeSummary[] | null> {
	const col = await geositesCollection();
	const doc = await col.findOne(
		{ slug },
		{ projection: { location: 1, locationIsSensitive: 1 } },
	);
	if (!doc) return null;
	const origin = publicPoint(doc);
	// $geoNear (on public points) shortlists; rankNearby rounds the distances.
	const candidates = await col
		.aggregate<SummaryDoc>([
			{
				$geoNear: {
					near: { type: "Point", coordinates: origin },
					key: "publicLocation",
					spherical: true,
					distanceField: "distanceMeters",
					maxDistance: NEARBY_MAX_METERS,
					query: { slug: { $ne: slug } },
				},
			},
			{ $limit: NEARBY_CANDIDATES },
			{ $project: SUMMARY_FIELDS },
		])
		.toArray();
	return rankNearby(origin, candidates, limit);
}

export async function findGeositeBySlug(slug: string): Promise<Geosite | null> {
	const col = await geositesCollection();
	const doc = await col.findOne({ slug });
	return doc ? toDto(doc) : null;
}

/** Every geosite's slug and last update, for the sitemap. */
export async function listGeositeSlugs(): Promise<
	{ slug: string; updatedAt: string }[]
> {
	const col = await geositesCollection();
	const docs = await col
		.find({}, { projection: { _id: 0, slug: 1, updatedAt: 1 } })
		.sort({ slug: 1 })
		.toArray();
	return docs.map((d) => ({
		slug: d.slug,
		updatedAt: d.updatedAt.toISOString(),
	}));
}
