/** Folds matched fossil records into one entry per genus. Pure. */
import type { FossilSource } from "~/features/geology/schemas";
import type { FossilGenus, GenusGeosite } from "./schemas";
import { genusSlug, type TaxonMatch } from "./taxonomy";

/** One occurrence's genus at one geosite. */
export type GenusRecord = {
	geosite: Omit<GenusGeosite, "records">;
	source: FossilSource;
	match: TaxonMatch;
	unit?: string;
	age?: string;
};

/** Units and ages are listed as recorded; keep the page readable. */
const MAX_LISTED = 12;

// Values read back from the Mongo cache carry null where a field was missing.
const firstDefined = (values: (string | null | undefined)[]) =>
	values.find((v) => v != null) ?? undefined;

export function aggregateGenera(
	records: GenusRecord[],
	updatedAt: string,
): FossilGenus[] {
	const byKey = new Map<number, GenusRecord[]>();
	for (const r of records) {
		const list = byKey.get(r.match.genusKey) ?? [];
		list.push(r);
		byKey.set(r.match.genusKey, list);
	}

	const taken = new Set<string>();
	return [...byKey.entries()]
		.sort(([a], [b]) => a - b)
		.map(([key, list]): FossilGenus => {
			const name = list[0]?.match.genus ?? "";
			// Homonyms (a plant and an animal genus) share a name; keep slugs unique.
			let slug = genusSlug(name);
			if (taken.has(slug)) slug = `${slug}-${key}`;
			taken.add(slug);

			const geosites = new Map<string, GenusGeosite>();
			for (const r of list) {
				const g = geosites.get(r.geosite.slug);
				if (g) g.records += 1;
				else geosites.set(r.geosite.slug, { ...r.geosite, records: 1 });
			}
			const distinct = (
				pick: (r: GenusRecord) => string | null | undefined,
				max = Number.POSITIVE_INFINITY,
			) =>
				[...new Set(list.map(pick).filter((v) => v != null))]
					.sort((a, b) => a.localeCompare(b))
					.slice(0, max);

			return {
				slug,
				name,
				gbifKey: key,
				classification: {
					kingdom: firstDefined(list.map((r) => r.match.kingdom)),
					phylum: firstDefined(list.map((r) => r.match.phylum)),
					class: firstDefined(list.map((r) => r.match.class)),
					order: firstDefined(list.map((r) => r.match.order)),
					family: firstDefined(list.map((r) => r.match.family)),
				},
				species: distinct((r) => r.match.species),
				geosites: [...geosites.values()].sort(
					(a, b) => b.records - a.records || a.name.localeCompare(b.name),
				),
				units: distinct((r) => r.unit, MAX_LISTED),
				ages: distinct((r) => r.age, MAX_LISTED),
				records: {
					sgb: list.filter((r) => r.source === "sgb").length,
					gbif: list.filter((r) => r.source === "gbif").length,
				},
				updatedAt,
			};
		});
}
