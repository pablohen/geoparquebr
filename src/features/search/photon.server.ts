/**
 * Place search via Photon (OpenStreetMap data, komoot's public instance),
 * which, unlike Nominatim, permits search-as-you-type. Restricted to Brazil.
 * https://photon.komoot.io
 */
import { z } from "zod";
import type { BBox } from "~/lib/geo";
import type { Place } from "./schemas";

const PHOTON_API = "https://photon.komoot.io/api/";
const BRAZIL_BBOX: BBox = [-74, -34, -34, 6];

const PhotonResponseSchema = z.object({
	features: z.array(
		z.object({
			geometry: z.object({
				type: z.literal("Point"),
				coordinates: z.tuple([z.number(), z.number()]),
			}),
			properties: z.object({
				osm_type: z.string().optional(),
				osm_id: z.number().optional(),
				osm_value: z.string().optional(),
				name: z.string().optional(),
				city: z.string().optional(),
				state: z.string().optional(),
				country: z.string().optional(),
				countrycode: z.string().optional(),
				/** [minLon, maxLat, maxLon, minLat] */
				extent: z
					.tuple([z.number(), z.number(), z.number(), z.number()])
					.optional(),
			}),
		}),
	),
});

/** Maps a Photon response to places, dropping unnamed and non-Brazilian hits. */
export function parsePhoton(json: unknown): Place[] {
	return PhotonResponseSchema.parse(json).features.flatMap((f, i): Place[] => {
		const p = f.properties;
		if (!p.name || (p.countrycode && p.countrycode !== "BR")) return [];
		const context = [p.city !== p.name ? p.city : undefined, p.state]
			.filter(Boolean)
			.join(", ");
		const [minLon, maxLat, maxLon, minLat] = p.extent ?? [];
		const bbox: BBox | undefined =
			minLon !== undefined &&
			maxLat !== undefined &&
			maxLon !== undefined &&
			minLat !== undefined
				? [minLon, minLat, maxLon, maxLat]
				: undefined;
		return [
			{
				id: p.osm_type && p.osm_id ? `${p.osm_type}${p.osm_id}` : `photon-${i}`,
				name: p.name,
				context: context || undefined,
				kind: p.osm_value,
				point: f.geometry.coordinates,
				bbox: bbox && bbox[0] < bbox[2] && bbox[1] < bbox[3] ? bbox : undefined,
			},
		];
	});
}

export async function searchPlaces(q: string, limit = 5): Promise<Place[]> {
	const url = new URL(PHOTON_API);
	url.search = new URLSearchParams({
		q,
		limit: String(limit),
		bbox: BRAZIL_BBOX.join(","),
	}).toString();
	const res = await fetch(url, {
		headers: { "User-Agent": "GeoparqueBR (https://github.com/)" },
		signal: AbortSignal.timeout(12_000),
	});
	if (!res.ok) throw new Error(`Photon: HTTP ${res.status}`);
	return parsePhoton(await res.json());
}
