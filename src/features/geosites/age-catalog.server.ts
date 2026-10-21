/**
 * Curated geological ages, each with a published source, for geosites where
 * the age derived from SGB's map at the site is plainly wrong (usually the
 * 1:1M map putting a famous sedimentary site on the basement next to it).
 *
 * Keep it short and sourced: add an entry only with a citable reference that
 * dates the very unit the geosite showcases. Bounds follow the ICS chart.
 */
import type { GeositeInput } from "./schemas";

type GeologicAge = NonNullable<GeositeInput["geologicAge"]>;

/** Keyed by GEOSSIT id. */
export const AGE_CATALOG: Record<number, GeologicAge> = {
	// Pedra Cariri: the laminated limestone quarried around Nova Olinda. The
	// 1:1M map puts the point on Archean basement.
	1997: {
		period: "Cretáceo Inferior (Aptiano)",
		formation: "Membro Crato, Formação Santana",
		minMa: 113.2,
		maxMa: 121.4,
		reference: {
			label:
				"Santos et al. (2017), Análise de fácies e petrografia de uma seção do Membro Crato em Nova Olinda (CE). Geologia USP, Série Científica 17(1)",
			url: "https://doi.org/10.11606/issn.2316-9095.v17-319",
		},
	},
};

/** The curated age for a geosite, if any; it replaces the map-derived one. */
export function curatedAge(source: { id: number }): GeologicAge | undefined {
	return AGE_CATALOG[source.id];
}
