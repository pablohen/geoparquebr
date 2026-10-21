/** Pure counting for the numbers, timeline and comparison pages. */
import {
	GEOLOGIC_PERIOD_IDS,
	type GeologicPeriodId,
	periodRangeMa,
} from "~/features/geology/time-scale";
import {
	GEOPARK_IDS,
	type GeoparkId,
	RelevanceSchema,
} from "~/features/geosites/schemas";
import type { GeositeStats, StatsRow, Tally, Timeline } from "./schemas";

/**
 * Periods a dated age range overlaps, youngest first. Same rule as the map's
 * age filter (`ageOverlaps`): ranges that merely touch a period don't count,
 * so a period's "ver no mapa" link shows the geosites counted here.
 */
export function periodsOf(row: Pick<StatsRow, "minMa" | "maxMa">) {
	const { minMa, maxMa } = row;
	if (minMa === undefined || maxMa === undefined) return [];
	return GEOLOGIC_PERIOD_IDS.filter((id) => {
		const [top, base] = periodRangeMa([id, id]);
		return maxMa > top && minMa < base;
	});
}

const byCountDesc = <K extends string>(counts: Map<K, number>) =>
	[...counts]
		.map(([key, count]) => ({ key, count }))
		.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

function bump<K>(counts: Map<K, number>, key: K) {
	counts.set(key, (counts.get(key) ?? 0) + 1);
}

export function tally(rows: StatsRow[]): Tally {
	const states = new Map<string, number>();
	const categories = new Map<StatsRow["categories"][number], number>();
	const relevance = new Map<StatsRow["relevance"], number>();
	const periods = new Map<GeologicPeriodId, number>();
	let dated = 0;
	for (const row of rows) {
		bump(states, row.state);
		for (const c of new Set(row.categories)) bump(categories, c);
		bump(relevance, row.relevance);
		const spans = periodsOf(row);
		if (spans.length > 0) dated++;
		for (const p of spans) bump(periods, p);
	}
	return {
		total: rows.length,
		dated,
		states: byCountDesc(states),
		categories: byCountDesc(categories),
		relevance: RelevanceSchema.options.map((key) => ({
			key,
			count: relevance.get(key) ?? 0,
		})),
		periods: GEOLOGIC_PERIOD_IDS.map((key) => ({
			key,
			count: periods.get(key) ?? 0,
		})),
	};
}

/** Brazil's counts plus each geopark's; `genera` lists each genus's geoparks. */
export function geositeStats(
	rows: StatsRow[],
	genera: { geoparks: GeoparkId[] }[],
): GeositeStats {
	return {
		...tally(rows),
		genera: genera.length,
		geoparks: GEOPARK_IDS.map((id) => ({
			id,
			...tally(rows.filter((r) => r.geoparkId === id)),
			genera: genera.filter((g) => g.geoparks.includes(id)).length,
		})),
	};
}

/** Every period, youngest first, with the geosites it spans, by name. */
export function timeline(rows: StatsRow[]): Timeline {
	const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name, "pt"));
	let undated = 0;
	const groups = new Map<GeologicPeriodId, Timeline["periods"][number]>(
		GEOLOGIC_PERIOD_IDS.map((id) => [id, { id, geosites: [] }]),
	);
	for (const { slug, name, municipality, state, ...age } of sorted) {
		const spans = periodsOf(age);
		if (spans.length === 0) undated++;
		for (const p of spans)
			groups.get(p)?.geosites.push({ slug, name, municipality, state });
	}
	return { periods: [...groups.values()], total: rows.length, undated };
}
