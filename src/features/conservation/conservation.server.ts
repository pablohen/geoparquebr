/** Server-only reads for the conservation page. */
import { geositesCollection } from "~/features/geosites/geosites.server";
import type { DegradationRisk, Geosite } from "~/features/geosites/schemas";
import { conservation } from "./conservation";
import type { Conservation } from "./schemas";

type Row = Pick<
	Geosite,
	| "slug"
	| "name"
	| "municipality"
	| "state"
	| "geoparkId"
	| "locationIsSensitive"
	| "scores"
> & { degradationRisk?: DegradationRisk };

/** Every geosite's risk; only names and places leave, never coordinates. */
export async function findConservation(): Promise<Conservation> {
	const rows = await (await geositesCollection())
		.find<Row>(
			{},
			{
				projection: {
					_id: 0,
					slug: 1,
					name: 1,
					municipality: 1,
					state: 1,
					geoparkId: 1,
					locationIsSensitive: 1,
					scores: 1,
					degradationRisk: 1,
				},
			},
		)
		.toArray();
	return conservation(
		rows.map(({ scores, ...r }) => ({
			...r,
			vulnerability: scores?.vulnerability,
		})),
	);
}
