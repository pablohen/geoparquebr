/** Filtering the `/fossils` index. Pure; runs on the loaded list. */
import type { GeoparkId } from "~/features/geosites/schemas";
import {
	type FossilGenusSummary,
	type FossilsSearch,
	genusGroup,
} from "./schemas";

/** The `group` value for genera with neither class nor phylum. */
export const OTHER_GROUP = "other";

const fold = (s: string) =>
	s.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();

const groupKey = (g: FossilGenusSummary) =>
	genusGroup(g.classification) || OTHER_GROUP;

export function filterGenera(
	genera: FossilGenusSummary[],
	{ q, group, gp }: FossilsSearch,
): FossilGenusSummary[] {
	const needle = q ? fold(q) : "";
	return genera.filter(
		(g) =>
			(!needle || fold(g.name).includes(needle)) &&
			(!group || groupKey(g) === group) &&
			(!gp || g.geoparks.includes(gp)),
	);
}

/** Groups with how many genera each has, largest first, "other" last. */
export function groupCounts(
	genera: FossilGenusSummary[],
): { group: string; count: number }[] {
	const counts = new Map<string, number>();
	for (const g of genera)
		counts.set(groupKey(g), (counts.get(groupKey(g)) ?? 0) + 1);
	return [...counts.entries()]
		.map(([group, count]) => ({ group, count }))
		.sort(
			(a, b) =>
				Number(a.group === OTHER_GROUP) - Number(b.group === OTHER_GROUP) ||
				b.count - a.count ||
				a.group.localeCompare(b.group),
		);
}

/** Geoparks with at least one genus, with counts. */
export function geoparkCounts(
	genera: FossilGenusSummary[],
): { id: GeoparkId; count: number }[] {
	const counts = new Map<GeoparkId, number>();
	for (const g of genera)
		for (const id of g.geoparks) counts.set(id, (counts.get(id) ?? 0) + 1);
	return [...counts.entries()]
		.map(([id, count]) => ({ id, count }))
		.sort((a, b) => b.count - a.count);
}

/** The index's sections: genera grouped like `groupCounts`. */
export function groupGenera(
	genera: FossilGenusSummary[],
): { group: string; genera: FossilGenusSummary[] }[] {
	return groupCounts(genera).map(({ group }) => ({
		group,
		genera: genera.filter((g) => groupKey(g) === group),
	}));
}
