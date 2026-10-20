/**
 * GBIF Occurrence API: fossil specimens held by museums worldwide.
 * https://techdocs.gbif.org/en/openapi/v1/occurrence
 */
import { z } from "zod";
import { haversineMeters } from "~/lib/geo";
import type { NearbyFossil } from "./sgb.server";

const GBIF_API = "https://api.gbif.org/v1";

const text = z
	.string()
	.nullish()
	.transform((s) => s?.trim() || undefined);

const OccurrenceSchema = z.object({
	key: z.number().int(),
	scientificName: text,
	decimalLatitude: z.number().nullish(),
	decimalLongitude: z.number().nullish(),
	formation: text,
	group: text,
	member: text,
	earliestAgeOrLowestStage: text,
	earliestEpochOrLowestSeries: text,
	earliestPeriodOrLowestSystem: text,
	locality: text,
	institutionCode: text,
	catalogNumber: text,
	typeStatus: z.union([z.string(), z.array(z.string())]).nullish(),
	license: text,
});

const SearchSchema = z.object({
	count: z.number().int(),
	results: z.array(OccurrenceSchema),
});

/** GBIF licenses come as legal-code URLs; show the short name. */
function licenseLabel(url: string | undefined): string | undefined {
	if (!url) return undefined;
	const match = url.match(/licenses\/([a-z-]+)\/(\d\.\d)/);
	if (match) return `CC-${match[1]?.toUpperCase()}-${match[2]}`;
	if (url.includes("publicdomain/zero")) return "CC0-1.0";
	return url;
}

export async function gbifFossilsNear(
	[lng, lat]: [number, number],
	radiusKm: number,
	limit = 100,
): Promise<{ items: NearbyFossil[]; total: number }> {
	const url = new URL(`${GBIF_API}/occurrence/search`);
	url.search = new URLSearchParams({
		geoDistance: `${lat},${lng},${radiusKm}km`,
		basisOfRecord: "FOSSIL_SPECIMEN",
		limit: String(limit),
	}).toString();

	const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
	if (!res.ok) throw new Error(`GBIF: HTTP ${res.status}`);
	const page = SearchSchema.parse(await res.json());

	const items = page.results.flatMap((r): NearbyFossil[] => {
		if (
			!r.scientificName ||
			r.decimalLatitude == null ||
			r.decimalLongitude == null
		)
			return [];
		const typeStatus = Array.isArray(r.typeStatus)
			? r.typeStatus.join(", ")
			: r.typeStatus?.trim() || undefined;
		return [
			{
				source: "gbif",
				id: String(r.key),
				taxa: [r.scientificName],
				unit:
					[r.member, r.formation, r.group].filter(Boolean).join(", ") ||
					undefined,
				age:
					[
						r.earliestAgeOrLowestStage,
						r.earliestEpochOrLowestSeries,
						r.earliestPeriodOrLowestSystem,
					]
						.filter(Boolean)
						.join(", ") || undefined,
				locality: r.locality,
				institution: r.institutionCode,
				specimen: r.catalogNumber,
				typeStatus,
				url: `https://www.gbif.org/occurrence/${r.key}`,
				license: licenseLabel(r.license),
				distanceM: haversineMeters(
					[lng, lat],
					[r.decimalLongitude, r.decimalLatitude],
				),
			},
		];
	});
	return { items, total: page.count };
}
