/** Paths and metadata for the fossil pages. */

import { FOSSIL_SEARCH_RADIUS_KM } from "~/features/geology/schemas";
import { pageMetaTags } from "~/features/geoparks/seo";
import { geositePath } from "~/features/geosites/seo";
import { getLocale } from "~/lib/i18n";
import { absoluteUrl } from "~/lib/site";
import { m } from "~/paraglide/messages.js";
import type { FossilGenus } from "./schemas";

export const FOSSILS_INDEX_PATH = "/fossils";
export const genusPath = (slug: string) => `/fossils/${slug}`;
export const gbifGenusUrl = (key: number) =>
	`https://www.gbif.org/species/${key}`;

export const fossilsIndexMetaTags = () =>
	pageMetaTags(
		m.fossils_title(),
		m.fossils_page_intro({ radiusKm: FOSSIL_SEARCH_RADIUS_KM }),
		FOSSILS_INDEX_PATH,
	);

export const genusMetaTags = (genus: FossilGenus) =>
	pageMetaTags(
		genus.name,
		m.fossils_genus_description({ genus: genus.name }),
		genusPath(genus.slug),
	);

/** schema.org Taxon (as Bioschemas uses it), linked to GBIF and the geosites. */
export function genusJsonLd(genus: FossilGenus) {
	const { family, order } = genus.classification;
	const parent = family ?? order;
	return {
		"@context": "https://schema.org",
		"@type": "Taxon",
		name: genus.name,
		taxonRank: "genus",
		url: absoluteUrl(genusPath(genus.slug)),
		sameAs: gbifGenusUrl(genus.gbifKey),
		inLanguage: getLocale(),
		...(parent && { parentTaxon: { "@type": "Taxon", name: parent } }),
		...(genus.species.length > 0 && {
			childTaxon: genus.species.map((name) => ({
				"@type": "Taxon",
				name,
				taxonRank: "species",
			})),
		}),
		subjectOf: genus.geosites.map((g) => ({
			"@type": "TouristAttraction",
			name: g.name,
			url: absoluteUrl(geositePath(g.slug)),
		})),
	};
}
