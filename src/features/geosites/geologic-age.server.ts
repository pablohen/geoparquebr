/**
 * Seed-time lookup of each geosite's geological age from SGB's geological
 * map (server-only). Results are cached in `api_cache`, so re-seeding only
 * asks SGB about new or moved geosites.
 */
import { sgbStrataIn } from "~/features/geology/sgb.server";
import { cached } from "~/lib/cache.server";
import { bboxAround } from "~/lib/geo";
import { geologicAgeFromUnits, unitsNamedIn } from "./geologic-age";

const TTL_MS = 180 * 24 * 60 * 60 * 1_000;
const CONCURRENCY = 6;

/** Units in a box around a point on SGB's most detailed map there, cached. */
const unitsAround = (point: [number, number], radiusKm: number) =>
	cached(`geosite-age:v2:${radiusKm}:${point.join(",")}`, TTL_MS, () =>
		sgbStrataIn(bboxAround(point, radiusKm)),
	);

/**
 * A geosite's age: the unit its own text names, if one is mapped within
 * 5 km; else the unit(s) under its point (~50 m), on the most detailed map
 * available. Undefined when the map has nothing there.
 */
async function geologicAgeFor(point: [number, number], text: string) {
	const nearby = await unitsAround(point, 5);
	const named = unitsNamedIn(text, nearby.units);
	if (named.length > 0) return geologicAgeFromUnits(named, nearby.scale);
	const here = await unitsAround(point, 0.05);
	return geologicAgeFromUnits(here.units, here.scale);
}

/**
 * Adds `geologicAge` to each geosite. A failed lookup leaves that geosite
 * without an age (and is counted) rather than aborting the import.
 */
export async function withGeologicAges<
	T extends {
		name: string;
		summary?: string;
		description?: string;
		location: { coordinates: [number, number] };
	},
>(geosites: T[]) {
	const out: (T & { geologicAge?: ReturnType<typeof geologicAgeFromUnits> })[] =
		[];
	let failed = 0;
	for (let i = 0; i < geosites.length; i += CONCURRENCY) {
		const batch = geosites.slice(i, i + CONCURRENCY);
		const ages = await Promise.all(
			batch.map((g) =>
				geologicAgeFor(
					g.location.coordinates,
					[g.name, g.summary, g.description].join(" "),
				).catch(() => {
					failed++;
					return undefined;
				}),
			),
		);
		batch.forEach((g, j) => {
			out.push({ ...g, geologicAge: ages[j] });
		});
	}
	return { geosites: out, failed };
}
