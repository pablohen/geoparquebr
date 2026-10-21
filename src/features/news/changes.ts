/** Comparing stored geosites with a fresh GEOSSIT import. Pure. */
import type { ChangeField, SyncChanges } from "./schemas";

/** The parts of a geosite the comparison reads. */
export type ComparableGeosite = {
	slug: string;
	name: string;
	/** GEOSSIT record; the slug stands in when it's missing. */
	source?: { id: number | string };
	summary?: string;
	description?: string;
	location: { coordinates: [number, number] };
	municipality: string;
	state: string;
	categories: string[];
	relevance: string;
	scores?: unknown;
	degradationRisk?: unknown;
	geology?: unknown;
	geologicAge?: unknown;
	geoparkId?: string;
	coverImageUrl?: string;
};

const pickers: Record<ChangeField, (g: ComparableGeosite) => unknown> = {
	name: (g) => g.name,
	description: (g) => [g.summary, g.description],
	location: (g) => g.location.coordinates,
	municipality: (g) => [g.municipality, g.state],
	categories: (g) => [...g.categories].sort(),
	relevance: (g) => g.relevance,
	scores: (g) => g.scores,
	degradationRisk: (g) => g.degradationRisk,
	geology: (g) => g.geology,
	geologicAge: (g) => g.geologicAge,
	geopark: (g) => g.geoparkId,
	photo: (g) => g.coverImageUrl,
};

/** JSON with sorted keys and no undefined/null values, so field order doesn't matter. */
export function canonical(value: unknown): string {
	return JSON.stringify(value, (_, v: unknown) => {
		if (v === null) return undefined;
		if (v && typeof v === "object" && !Array.isArray(v))
			return Object.fromEntries(
				Object.entries(v as Record<string, unknown>)
					.filter(([, x]) => x !== undefined && x !== null)
					.sort(([a], [b]) => a.localeCompare(b)),
			);
		return v;
	});
}

const key = (g: ComparableGeosite) => String(g.source?.id ?? g.slug);

/** Added, changed (with which fields) and removed geosites, matched by GEOSSIT id. */
export function diffGeosites(
	before: ComparableGeosite[],
	after: ComparableGeosite[],
): SyncChanges {
	const old = new Map(before.map((g) => [key(g), g]));
	const fresh = new Set(after.map(key));
	const byName = (a: { name: string }, b: { name: string }) =>
		a.name.localeCompare(b.name);

	const added: SyncChanges["added"] = [];
	const changed: SyncChanges["changed"] = [];
	for (const g of after) {
		const previous = old.get(key(g));
		if (!previous) {
			added.push({ slug: g.slug, name: g.name });
			continue;
		}
		const fields = (Object.keys(pickers) as ChangeField[]).filter(
			(f) => canonical(pickers[f](previous)) !== canonical(pickers[f](g)),
		);
		if (fields.length > 0) changed.push({ slug: g.slug, name: g.name, fields });
	}
	const removed = before
		.filter((g) => !fresh.has(key(g)))
		.map((g) => ({ name: g.name }));

	return {
		added: added.sort(byName),
		changed: changed.sort(byName),
		removed: removed.sort(byName),
	};
}

export const hasChanges = (c: SyncChanges) =>
	c.added.length + c.changed.length + c.removed.length > 0;
