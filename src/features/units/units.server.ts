/** Server-only reads for the rock unit pages. */
import { generaNearGeosites } from "~/features/fossils/fossils.server";
import { geositesCollection } from "~/features/geosites/geosites.server";
import type { UnitPage, UnitSummary } from "./schemas";
import {
	groupByUnit,
	matchUnits,
	type UnitRow,
	unitAge,
	unitNames,
	unitSlug,
} from "./units";

/** Geosites with a mapped unit, by name; no coordinates. */
async function unitRows(): Promise<UnitRow[]> {
	const col = await geositesCollection();
	const rows = await col
		.find<UnitRow>(
			{ "geologicAge.formation": { $exists: true, $ne: "" } },
			{
				projection: {
					_id: 0,
					slug: 1,
					name: 1,
					municipality: 1,
					state: 1,
					geoparkId: 1,
					geologicAge: 1,
				},
			},
		)
		.toArray();
	return rows.sort((a, b) => a.name.localeCompare(b.name, "pt"));
}

/** Every unit with geosites, most geosites first. */
export async function listUnits(): Promise<UnitSummary[]> {
	return [...groupByUnit(await unitRows()).values()]
		.map(({ slug, name, rows }) => ({ slug, name, geositeCount: rows.length }))
		.sort(
			(a, b) =>
				b.geositeCount - a.geositeCount || a.name.localeCompare(b.name, "pt"),
		);
}

export async function findUnit(slug: string): Promise<UnitPage | null> {
	const group = groupByUnit(await unitRows()).get(slug);
	if (!group) return null;
	return {
		slug,
		name: group.name,
		geositeCount: group.rows.length,
		age: unitAge(group.rows),
		geosites: group.rows.map((r) => ({
			slug: r.slug,
			name: r.name,
			municipality: r.municipality,
			state: r.state,
			geoparkId: r.geoparkId as UnitPage["geosites"][number]["geoparkId"],
			alongside: unitNames(r.geologicAge?.formation).filter(
				(n) => unitSlug(n) !== slug,
			),
		})),
		genera: await generaNearGeosites(group.rows.map((r) => r.slug)),
	};
}

/** Units for the header search, most geosites first. */
export async function searchUnits(q: string): Promise<UnitSummary[]> {
	return matchUnits(await listUnits(), q);
}
