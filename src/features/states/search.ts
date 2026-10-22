/**
 * State and region matches for the header search. Fixed lists, so this runs
 * on the client like the geopark matches.
 */
import { regionLabel } from "./labels";
import { REGION_IDS, type Region, stateName, UFS, type Uf } from "./states";

const fold = (s: string) =>
	s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

const words = (q: string) => fold(q).split(/\s+/).filter(Boolean);

/**
 * States whose name contains every word ("rio grande", "sao paulo"), or
 * whose code is the whole query ("pe"); at most `limit`.
 */
export function matchStates(query: string, limit = 3): Uf[] {
	const w = words(query);
	if (w.length === 0) return [];
	const code = fold(query.trim());
	return UFS.filter((uf) => {
		if (code.length === 2) return uf.toLowerCase() === code;
		const name = fold(stateName(uf));
		return w.every((x) => name.includes(x));
	}).slice(0, limit);
}

/** Regions whose name (in the current locale) contains every word. */
export function matchRegions(query: string): Region[] {
	const w = words(query);
	if (w.length === 0) return [];
	return REGION_IDS.filter((r) => {
		const name = fold(`${regionLabel(r)} ${r.replace(/-/g, " ")}`);
		return w.every((x) => name.includes(x));
	});
}
