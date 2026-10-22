/**
 * Rock units (formations, groups, suites…) as SGB's geological map names them
 * at each geosite. A geosite on a contact carries several, joined by " / ".
 * Pure and isomorphic.
 */

export const UNITS_PATH = "/units";
export const unitPath = (slug: string) => `${UNITS_PATH}/${slug}`;

/** "Formação Sousa / Grupo  Rio do Peixe" → ["Formação Sousa", "Grupo Rio do Peixe"]. */
export function unitNames(formation: string | undefined): string[] {
	if (!formation) return [];
	return [
		...new Set(
			formation
				.split(" / ")
				.map((n) => n.replace(/\s+/g, " ").trim())
				.filter((n) => n.length > 1),
		),
	];
}

/** "Formação São Desidério" → "formacao-sao-desiderio". */
export function unitSlug(name: string): string {
	return name
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

export type UnitRow = {
	slug: string;
	name: string;
	municipality: string;
	state: string;
	geoparkId?: string;
	geologicAge?: {
		period: string;
		formation?: string;
		minMa?: number;
		maxMa?: number;
		mapScale?: number;
	};
};

export type UnitGroup<R extends UnitRow> = {
	slug: string;
	name: string;
	rows: R[];
};

/** Geosites by the units mapped at them; a geosite on a contact is in each. */
export function groupByUnit<R extends UnitRow>(
	rows: R[],
): Map<string, UnitGroup<R>> {
	const groups = new Map<string, UnitGroup<R>>();
	for (const row of rows)
		for (const name of unitNames(row.geologicAge?.formation)) {
			const slug = unitSlug(name);
			if (!slug) continue;
			const group = groups.get(slug) ?? { slug, name, rows: [] };
			group.rows.push(row);
			groups.set(slug, group);
		}
	return groups;
}

/**
 * The unit's mapped age, from geosites where it is the only unit at the
 * point: there the map's range is the unit's own. Undefined when it only
 * appears on contacts, whose ages mix several units.
 */
export function unitAge(rows: UnitRow[]) {
	const alone = rows.flatMap((r) =>
		r.geologicAge && unitNames(r.geologicAge.formation).length === 1
			? [r.geologicAge]
			: [],
	);
	if (alone.length === 0) return undefined;
	const periods = new Map<string, number>();
	for (const a of alone)
		periods.set(a.period, (periods.get(a.period) ?? 0) + 1);
	const period = [...periods].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
	const mins = alone.flatMap((a) => (a.minMa === undefined ? [] : [a.minMa]));
	const maxes = alone.flatMap((a) => (a.maxMa === undefined ? [] : [a.maxMa]));
	return {
		period,
		minMa: mins.length ? Math.min(...mins) : undefined,
		maxMa: maxes.length ? Math.max(...maxes) : undefined,
		mapScale: alone.find((a) => a.mapScale)?.mapScale,
	};
}
