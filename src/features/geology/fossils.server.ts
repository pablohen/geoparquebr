/**
 * Fossil occurrences around a geosite, from SGB and GBIF. Shared by the
 * geosite's fossil tab and the fossil genus index, so both use one cache.
 */
import { cached } from "~/lib/cache.server";
import { bboxAround } from "~/lib/geo";
import { gbifFossilsNear } from "./gbif.server";
import { FOSSIL_SEARCH_RADIUS_KM, type FossilSource } from "./schemas";
import { type NearbyFossil, sgbFossilsNear } from "./sgb.server";

const WEEK_MS = 7 * 24 * 60 * 60 * 1_000;

export type FossilLookup = () => Promise<{
	items: NearbyFossil[];
	total: number;
}>;

/** One cached lookup per source; each fails on its own when called. */
export function fossilLookups(
	slug: string,
	point: [number, number],
): Record<FossilSource, FossilLookup> {
	const radiusKm = FOSSIL_SEARCH_RADIUS_KM;
	return {
		sgb: () =>
			cached(`fossils:sgb:v3:${slug}`, WEEK_MS, () =>
				sgbFossilsNear(point, bboxAround(point, radiusKm), radiusKm),
			),
		gbif: () =>
			cached(`fossils:gbif:v1:${slug}`, WEEK_MS, () =>
				gbifFossilsNear(point, radiusKm),
			),
	};
}
