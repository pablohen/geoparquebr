/**
 * Geopark matches for the header search. Six fixed names, so this runs on
 * the client: no server call, results appear as soon as you type.
 */
import { geoparkIdLabel } from "~/features/geosites/labels";
import type { GeoparkId } from "~/features/geosites/schemas";
import { GEOPARKS } from "./geoparks";

const fold = (s: string) =>
	s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Geoparks whose name (in the current locale) or id contains every word of
 * the query, ignoring case and accents: "serido", "canions sul", "uberaba".
 */
export function matchGeoparks(query: string): GeoparkId[] {
	const words = fold(query).split(/\s+/).filter(Boolean);
	if (words.length === 0) return [];
	return (Object.keys(GEOPARKS) as GeoparkId[]).filter((id) => {
		const haystack = fold(`${geoparkIdLabel(id)} ${id.replace(/-/g, " ")}`);
		return words.every((w) => haystack.includes(w));
	});
}
