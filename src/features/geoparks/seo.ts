/** Metadata for the geopark pages: titles, share previews, structured data. */
import { geoparkIdLabel } from "~/features/geosites/labels";
import type { GeoparkId } from "~/features/geosites/schemas";
import { geositePath, ogLocaleTags } from "~/features/geosites/seo";
import { geoparkCardPath } from "~/features/share/card-response";
import { getLocale } from "~/lib/i18n";
import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_NAME } from "~/lib/site";
import { m } from "~/paraglide/messages.js";
import { geoparkPath } from "./geoparks";
import { geoparkAbout } from "./labels";
import type { GeoparkGeosite } from "./schemas";

export const GEOPARKS_INDEX_PATH = "/geoparks";

/** `<meta>` tags for a standalone page; also used by the fossil pages. */
export function pageMetaTags(
	title: string,
	description: string,
	path: string,
	image = DEFAULT_OG_IMAGE,
) {
	return [
		{ title: `${title} — ${SITE_NAME}` },
		{ name: "description", content: description },
		{ property: "og:type", content: "website" },
		...ogLocaleTags(),
		{ property: "og:title", content: title },
		{ property: "og:description", content: description },
		{ property: "og:url", content: absoluteUrl(path) },
		{ property: "og:image", content: image },
		{ property: "og:image:alt", content: title },
		{ property: "og:image:width", content: "1200" },
		{ property: "og:image:height", content: "630" },
		{ name: "twitter:card", content: "summary_large_image" },
		{ name: "twitter:title", content: title },
		{ name: "twitter:description", content: description },
		{ name: "twitter:image", content: image },
	];
}

export const geoparkMetaTags = (id: GeoparkId) =>
	pageMetaTags(
		geoparkIdLabel(id),
		geoparkAbout(id),
		geoparkPath(id),
		absoluteUrl(geoparkCardPath(id)),
	);

export const geoparksIndexMetaTags = () =>
	pageMetaTags(m.geoparks_title(), m.geoparks_intro(), GEOPARKS_INDEX_PATH);

/** schema.org structured data: the geopark and the geosites in it. */
export function geoparkJsonLd(id: GeoparkId, geosites: GeoparkGeosite[]) {
	return {
		"@context": "https://schema.org",
		"@type": "TouristDestination",
		name: geoparkIdLabel(id),
		description: geoparkAbout(id),
		url: absoluteUrl(geoparkPath(id)),
		inLanguage: getLocale(),
		...(geosites.length > 0 && {
			containsPlace: geosites.map((g) => ({
				"@type": "TouristAttraction",
				name: g.name,
				url: absoluteUrl(geositePath(g.slug)),
			})),
		}),
	};
}
