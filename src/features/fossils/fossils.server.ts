/**
 * Fossil genera recorded near geosites, built by `pnpm db:fossils` from the
 * same SGB and GBIF lookups as each geosite's fossil tab. Names are resolved
 * against the GBIF backbone, so pages exist only for real genera.
 *
 * Coordinates never enter this collection: a genus page lists geosites, not
 * where each specimen was found.
 */
import type { Collection } from "mongodb";
import { fossilLookups } from "~/features/geology/fossils.server";
import type { FossilSource } from "~/features/geology/schemas";
import { geositesCollection } from "~/features/geosites/geosites.server";
import type { GeoparkId } from "~/features/geosites/schemas";
import { cached } from "~/lib/cache.server";
import { getDb } from "~/lib/db.server";
import { aggregateGenera, type GenusRecord } from "./aggregate";
import type { FossilGenus, FossilGenusSummary, GenusLink } from "./schemas";
import { acceptMatch, matchQuery, type TaxonMatch } from "./taxonomy";

const GBIF_API = "https://api.gbif.org/v1";
const MONTH_MS = 30 * 24 * 60 * 60 * 1_000;
const CONCURRENCY = 4;
/** Above this share of failed geosite lookups, nothing is written. */
const MAX_FAILED_SHARE = 0.1;

type FossilGenusDoc = Omit<FossilGenus, "slug" | "updatedAt"> & {
	_id: string;
	updatedAt: Date;
};

export async function fossilGeneraCollection(): Promise<
	Collection<FossilGenusDoc>
> {
	return (await getDb()).collection<FossilGenusDoc>("fossil_genera");
}

const toDto = ({ _id, updatedAt, ...rest }: FossilGenusDoc): FossilGenus => ({
	...rest,
	slug: _id,
	updatedAt: updatedAt.toISOString(),
});

/** GBIF backbone match for one cleaned name; misses are cached too. */
async function matchTaxon(query: string): Promise<TaxonMatch | null> {
	return cached(`gbif-match:v1:${query.toLowerCase()}`, MONTH_MS, async () => {
		const url = new URL(`${GBIF_API}/species/match`);
		url.search = new URLSearchParams({ name: query }).toString();
		const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
		if (!res.ok) throw new Error(`GBIF match: HTTP ${res.status}`);
		return acceptMatch(query, await res.json());
	});
}

export type FossilIndexReport = {
	geosites: number;
	failedLookups: number;
	failedMatches: number;
	genera: number;
	unmatchedNames: number;
	deleted: number;
};

/**
 * Rebuilds `fossil_genera`. Writes nothing when more than 10% of the
 * geosites' upstream lookups fail, so an outage can't prune the index.
 */
export async function buildFossilIndex({
	log = () => {},
}: {
	log?: (line: string) => void;
} = {}): Promise<FossilIndexReport> {
	const geosites = await (await geositesCollection())
		.find(
			{},
			{
				projection: {
					slug: 1,
					name: 1,
					municipality: 1,
					state: 1,
					geoparkId: 1,
					location: 1,
				},
			},
		)
		.sort({ slug: 1 })
		.toArray();

	if (geosites.length === 0)
		throw new Error("No geosites stored; run pnpm db:seed first");

	const records: GenusRecord[] = [];
	const unmatched = new Set<string>();
	let failedLookups = 0;
	let lookups = 0;
	// Many geosites record the same names; match each once per run.
	const matches = new Map<string, Promise<TaxonMatch | null | "failed">>();
	const match = (query: string) => {
		let pending = matches.get(query);
		if (!pending) {
			pending = matchTaxon(query).catch((err) => {
				log(`  match "${query}": ${String(err)}`);
				return "failed" as const;
			});
			matches.set(query, pending);
		}
		return pending;
	};

	for (let i = 0; i < geosites.length; i += CONCURRENCY) {
		await Promise.all(
			geosites.slice(i, i + CONCURRENCY).map(async (g) => {
				const geosite = {
					slug: g.slug,
					name: g.name,
					municipality: g.municipality,
					state: g.state,
					...(g.geoparkId && { geoparkId: g.geoparkId as GeoparkId }),
				};
				const sources = fossilLookups(g.slug, g.location.coordinates);
				for (const source of Object.keys(sources) as FossilSource[]) {
					lookups += 1;
					let items: Awaited<
						ReturnType<(typeof sources)[FossilSource]>
					>["items"];
					try {
						({ items } = await sources[source]());
					} catch (err) {
						failedLookups += 1;
						log(`  ${g.slug} (${source}): ${String(err)}`);
						continue;
					}
					for (const occurrence of items) {
						// One occurrence counts once per genus, however many names it lists.
						const seen = new Set<number>();
						for (const taxon of occurrence.taxa) {
							const query = matchQuery(taxon);
							if (!query) continue;
							const matched = await match(query);
							if (matched === "failed") continue;
							if (!matched) {
								unmatched.add(query);
								continue;
							}
							if (seen.has(matched.genusKey)) continue;
							seen.add(matched.genusKey);
							records.push({
								geosite,
								source,
								match: matched,
								unit: occurrence.unit,
								age: occurrence.age,
							});
						}
					}
				}
			}),
		);
		log(
			`  ${Math.min(i + CONCURRENCY, geosites.length)}/${geosites.length} geosites`,
		);
	}

	if (failedLookups > lookups * MAX_FAILED_SHARE)
		throw new Error(
			`${failedLookups} of ${lookups} fossil lookups failed; fossil_genera left unchanged`,
		);
	const outcomes = await Promise.all(matches.values());
	const failedMatches = outcomes.filter((o) => o === "failed").length;
	if (failedMatches > outcomes.length * MAX_FAILED_SHARE)
		throw new Error(
			`${failedMatches} of ${outcomes.length} GBIF name matches failed; fossil_genera left unchanged`,
		);

	const now = new Date();
	const genera = aggregateGenera(records, now.toISOString());
	const col = await fossilGeneraCollection();
	await col.createIndex({ "geosites.slug": 1 }, { name: "geosite_slug" });
	if (genera.length > 0)
		await col.bulkWrite(
			genera.map(({ slug, updatedAt: _, ...rest }) => ({
				replaceOne: {
					filter: { _id: slug },
					replacement: { ...rest, updatedAt: now },
					upsert: true,
				},
			})),
		);
	const { deletedCount } = await col.deleteMany({
		_id: { $nin: genera.map((g) => g.slug) },
	});

	return {
		geosites: geosites.length,
		failedLookups,
		failedMatches,
		genera: genera.length,
		unmatchedNames: unmatched.size,
		deleted: deletedCount,
	};
}

export async function findFossilGenus(
	slug: string,
): Promise<FossilGenus | null> {
	const doc = await (await fossilGeneraCollection()).findOne({ _id: slug });
	return doc ? toDto(doc) : null;
}

/** Every genus, by name, with counts for the index page. */
export async function listFossilGenera(): Promise<FossilGenusSummary[]> {
	const docs = await (await fossilGeneraCollection())
		.find({}, { sort: { name: 1 } })
		.toArray();
	return docs.map((d) => ({
		slug: d._id,
		name: d.name,
		classification: d.classification,
		geositeCount: d.geosites.length,
		speciesCount: d.species.length,
	}));
}

/** Genera recorded near any of these geosites, by name. */
export async function generaNearGeosites(
	slugs: string[],
): Promise<GenusLink[]> {
	if (slugs.length === 0) return [];
	const docs = await (await fossilGeneraCollection())
		.find(
			{ "geosites.slug": { $in: slugs } },
			{ projection: { name: 1 }, sort: { name: 1 } },
		)
		.toArray();
	return docs.map((d) => ({ slug: d._id, name: d.name }));
}

/** Genera recorded near any of a geopark's geosites. */
export async function generaNearGeopark(id: GeoparkId): Promise<GenusLink[]> {
	const slugs = await (await geositesCollection()).distinct("slug", {
		geoparkId: id,
	});
	return generaNearGeosites(slugs);
}

export async function listFossilGenusPages(): Promise<
	{ slug: string; updatedAt: string }[]
> {
	const docs = await (await fossilGeneraCollection())
		.find({}, { projection: { updatedAt: 1 } })
		.toArray();
	return docs.map((d) => ({
		slug: d._id,
		updatedAt: d.updatedAt.toISOString(),
	}));
}
