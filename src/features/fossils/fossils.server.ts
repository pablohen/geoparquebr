/**
 * Fossil genera recorded near geosites, from the same SGB and GBIF lookups as
 * each geosite's fossil tab. Names are resolved against the GBIF backbone, so
 * pages exist only for real genera. Two collections:
 * - `fossil_sites`: each geosite's matched records, refreshed by
 *   `pnpm db:fossils` (all) or the daily cron (the stalest, for ~40 s);
 * - `fossil_genera`: the genus pages, rebuilt from `fossil_sites`.
 *
 * Coordinates never enter either: a genus page lists geosites, not where each
 * specimen was found.
 */
import type { Collection } from "mongodb";
import { fossilLookups } from "~/features/geology/fossils.server";
import type { FossilSource } from "~/features/geology/schemas";
import { geositesCollection } from "~/features/geosites/geosites.server";
import type { GeoparkId } from "~/features/geosites/schemas";
import { cached } from "~/lib/cache.server";
import { getDb } from "~/lib/db.server";
import { aggregateGenera, type GenusRecord } from "./aggregate";
import {
	type FossilGenus,
	type FossilGenusSummary,
	type GenusLink,
	type GenusSearchHit,
	genusGroup,
} from "./schemas";
import { acceptMatch, matchQuery, type TaxonMatch } from "./taxonomy";

const GBIF_API = "https://api.gbif.org/v1";
const MONTH_MS = 30 * 24 * 60 * 60 * 1_000;
const CONCURRENCY = 4;
/** Above this share of failed geosites, `pnpm db:fossils` writes no pages. */
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

/** One geosite's matched fossil records, kept between refreshes. */
type SiteRecord = Omit<GenusRecord, "geosite">;
type FossilSiteDoc = {
	_id: string;
	records: SiteRecord[];
	unmatchedNames: string[];
	refreshedAt: Date;
};

export async function fossilSitesCollection(): Promise<
	Collection<FossilSiteDoc>
> {
	return (await getDb()).collection<FossilSiteDoc>("fossil_sites");
}

export type FossilRefreshReport = {
	geosites: number;
	refreshed: number;
	failed: number;
	/** Geosites never refreshed yet (none after a full run). */
	missing: number;
};

/**
 * Refreshes `fossil_sites`: the SGB and GBIF records near each geosite,
 * matched against the GBIF backbone. Geosites with no record yet go first,
 * then the longest unrefreshed. With `deadline` (epoch ms) it starts no new
 * batch after that time, so the daily cron can work through them in slices.
 * A geosite whose lookups or name matches fail keeps its previous records.
 * Geosites at their municipality's centre get none: records around that
 * point aren't the site's.
 */
export async function refreshFossilSites({
	log = () => {},
	deadline = Number.POSITIVE_INFINITY,
}: {
	log?: (line: string) => void;
	deadline?: number;
} = {}): Promise<FossilRefreshReport> {
	const geosites = await (await geositesCollection())
		.find(
			{ locationIsApproximate: { $ne: true } },
			{ projection: { slug: 1, location: 1 } },
		)
		.toArray();
	if (geosites.length === 0)
		throw new Error("No geosites stored; run pnpm db:seed first");

	const sites = await fossilSitesCollection();
	await sites.deleteMany({ _id: { $nin: geosites.map((g) => g.slug) } });
	await sites.createIndex({ refreshedAt: 1 }, { name: "refreshed_at" });
	const refreshedAt = new Map(
		(await sites.find({}, { projection: { refreshedAt: 1 } }).toArray()).map(
			(d) => [d._id, d.refreshedAt.getTime()],
		),
	);
	const queue = [...geosites].sort(
		(a, b) =>
			(refreshedAt.get(a.slug) ?? -1) - (refreshedAt.get(b.slug) ?? -1) ||
			a.slug.localeCompare(b.slug),
	);

	// Many geosites record the same names; match each once per run.
	const matches = new Map<string, Promise<TaxonMatch | null>>();
	const match = (query: string) => {
		let pending = matches.get(query);
		if (!pending) {
			pending = matchTaxon(query);
			// A failed match isn't cached; let a later geosite retry it.
			pending.catch(() => matches.delete(query));
			matches.set(query, pending);
		}
		return pending;
	};

	let refreshed = 0;
	let failed = 0;
	for (let i = 0; i < queue.length; i += CONCURRENCY) {
		if (Date.now() > deadline) break;
		await Promise.all(
			queue.slice(i, i + CONCURRENCY).map(async (g) => {
				try {
					const { records, unmatched } = await siteRecords(
						g.slug,
						g.location.coordinates,
						match,
					);
					await sites.replaceOne(
						{ _id: g.slug },
						{ records, unmatchedNames: unmatched, refreshedAt: new Date() },
						{ upsert: true },
					);
					refreshedAt.set(g.slug, Date.now());
					refreshed += 1;
				} catch (err) {
					failed += 1;
					log(`  ${g.slug}: ${String(err)}`);
				}
			}),
		);
		log(
			`  ${Math.min(i + CONCURRENCY, queue.length)}/${queue.length} geosites`,
		);
	}

	return {
		geosites: geosites.length,
		refreshed,
		failed,
		missing: geosites.filter((g) => !refreshedAt.has(g.slug)).length,
	};
}

/** Throws when any upstream lookup or name match fails. */
async function siteRecords(
	slug: string,
	point: [number, number],
	match: (query: string) => Promise<TaxonMatch | null>,
): Promise<{ records: SiteRecord[]; unmatched: string[] }> {
	const sources = fossilLookups(slug, point);
	const records: SiteRecord[] = [];
	const unmatched = new Set<string>();
	for (const source of Object.keys(sources) as FossilSource[]) {
		const { items } = await sources[source]();
		for (const occurrence of items) {
			// One occurrence counts once per genus, however many names it lists.
			const seen = new Set<number>();
			for (const taxon of occurrence.taxa) {
				const query = matchQuery(taxon);
				if (!query) continue;
				const matched = await match(query);
				if (!matched) {
					unmatched.add(query);
					continue;
				}
				if (seen.has(matched.genusKey)) continue;
				seen.add(matched.genusKey);
				records.push({
					source,
					match: matched,
					unit: occurrence.unit ?? undefined,
					age: occurrence.age ?? undefined,
				});
			}
		}
	}
	return { records, unmatched: [...unmatched] };
}

/** Below this share of geosites with records, the genus pages are left alone. */
export const MIN_FOSSIL_COVERAGE = 0.9;

export type FossilRebuildReport = {
	genera: number;
	deleted: number;
	coverage: number;
};

/**
 * Rebuilds `fossil_genera` from `fossil_sites`, with each geosite's current
 * name and geopark. Writes nothing while fewer than 90% of the geosites have
 * records (a first, partial refresh would otherwise prune most pages).
 */
export async function rebuildFossilGenera(): Promise<FossilRebuildReport> {
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
				},
			},
		)
		.toArray();
	const sites = await fossilSitesCollection();
	// Geosites GEOSSIT dropped take their records with them.
	await sites.deleteMany({ _id: { $nin: geosites.map((g) => g.slug) } });
	const bySlug = new Map(
		(await sites.find({}).toArray()).map((d) => [d._id, d]),
	);

	const coverage = geosites.length > 0 ? bySlug.size / geosites.length : 0;
	if (coverage < MIN_FOSSIL_COVERAGE)
		throw new Error(
			`only ${Math.round(coverage * 100)}% of geosites have fossil records; fossil_genera left unchanged`,
		);

	const records: GenusRecord[] = geosites.flatMap((g) =>
		(bySlug.get(g.slug)?.records ?? []).map((r) => ({
			...r,
			geosite: {
				slug: g.slug,
				name: g.name,
				municipality: g.municipality,
				state: g.state,
				...(g.geoparkId && { geoparkId: g.geoparkId as GeoparkId }),
			},
		})),
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
	return { genera: genera.length, deleted: deletedCount, coverage };
}

export type FossilIndexReport = FossilRefreshReport & FossilRebuildReport;

/**
 * `pnpm db:fossils`: refreshes every geosite, then rebuilds the genus pages.
 * Writes no genus pages when more than 10% of the geosites failed.
 */
export async function buildFossilIndex({
	log = () => {},
}: {
	log?: (line: string) => void;
} = {}): Promise<FossilIndexReport> {
	const refresh = await refreshFossilSites({ log });
	if (refresh.failed > refresh.geosites * MAX_FAILED_SHARE)
		throw new Error(
			`fossil lookups failed for ${refresh.failed} of ${refresh.geosites} geosites; fossil_genera left unchanged`,
		);
	return { ...refresh, ...(await rebuildFossilGenera()) };
}

/**
 * The daily cron's share: refresh the stalest geosites for up to `budgetMs`,
 * then rebuild. A skipped rebuild (low coverage) is reported, not thrown.
 */
export async function refreshFossilIndexSlice({
	budgetMs,
	log = () => {},
}: {
	budgetMs: number;
	log?: (line: string) => void;
}): Promise<FossilRefreshReport & { rebuild: FossilRebuildReport | string }> {
	const refresh = await refreshFossilSites({
		log,
		deadline: Date.now() + budgetMs,
	});
	try {
		return { ...refresh, rebuild: await rebuildFossilGenera() };
	} catch (err) {
		return { ...refresh, rebuild: String(err) };
	}
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
		geoparks: [
			...new Set(d.geosites.flatMap((g) => (g.geoparkId ? [g.geoparkId] : []))),
		],
	}));
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Genera whose name, or a species recorded, starts with the query (any word),
 * names first, at most `limit`. Case-insensitive.
 */
export async function searchFossilGenera(
	q: string,
	limit = 5,
): Promise<GenusSearchHit[]> {
	const word = new RegExp(`(^|\\s)${escapeRegex(q.trim())}`, "i");
	const docs = await (await fossilGeneraCollection())
		.find(
			{ $or: [{ name: word }, { species: word }] },
			{ projection: { name: 1, classification: 1, geosites: 1 } },
		)
		.limit(50)
		.toArray();
	const start = new RegExp(`^${escapeRegex(q.trim())}`, "i");
	return docs
		.sort(
			(a, b) =>
				Number(start.test(b.name)) - Number(start.test(a.name)) ||
				a.name.localeCompare(b.name),
		)
		.slice(0, limit)
		.map((d) => ({
			slug: d._id,
			name: d.name,
			...(genusGroup(d.classification) && {
				group: genusGroup(d.classification),
			}),
			geositeCount: d.geosites.length,
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
