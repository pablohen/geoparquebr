/**
 * Metadata for geosite pages: titles, share previews, structured data,
 * directions links and the sitemap. Pure functions, isomorphic; copy and
 * URLs follow the current locale.
 */

import { geositeCardPath } from "~/features/share/card-response";
import { getLocale, locales, OG_LOCALES } from "~/lib/i18n";
import { absoluteUrl, SITE_NAME } from "~/lib/site";
import { categoryLabel, geoparkIdLabel } from "./labels";
import type { Geosite } from "./schemas";

export const geositePath = (slug: string) => `/geosites/${slug}`;

/** Trims to `max` characters at a word boundary, adding an ellipsis. */
export function truncate(text: string, max: number): string {
	const flat = text.replace(/\s+/g, " ").trim();
	if (flat.length <= max) return flat;
	const cut = flat.slice(0, max - 1);
	// Only drop the last word when the cut actually split it.
	const endsOnWord = /\s/.test(flat.charAt(max - 1));
	return `${endsOnWord ? cut.trimEnd() : cut.replace(/\s+\S*$/, "")}…`;
}

export type GeositeMeta = {
	title: string;
	description: string;
	url: string;
	image: string;
	imageAlt: string;
};

/** Title, description, URL and share card (`/og/geosites/…`), in the current locale. */
export function geositeMeta(g: Geosite): GeositeMeta {
	const context = [
		`${g.municipality} – ${g.state}`,
		g.geoparkId ? geoparkIdLabel(g.geoparkId) : undefined,
	]
		.filter(Boolean)
		.join(" · ");
	const summary = g.summary || g.description || "";
	return {
		title: `${g.name} — ${SITE_NAME}`,
		description: truncate(summary ? `${context}. ${summary}` : context, 160),
		url: absoluteUrl(geositePath(g.slug)),
		image: absoluteUrl(geositeCardPath(g.slug)),
		imageAlt: g.name,
	};
}

/**
 * `og:locale` for the current locale. No `og:locale:alternate`: TanStack's
 * head keeps one meta per property, so repeats would collapse into one, and
 * the hreflang links already list every language.
 */
export function ogLocaleTags() {
	return [{ property: "og:locale", content: OG_LOCALES[getLocale()] }];
}

/** `<meta>` tags for TanStack Router's `head()`. */
export function geositeMetaTags(g: Geosite) {
	const m = geositeMeta(g);
	return [
		{ title: m.title },
		{ name: "description", content: m.description },
		{ property: "og:type", content: "place" },
		...ogLocaleTags(),
		{ property: "og:title", content: g.name },
		{ property: "og:description", content: m.description },
		{ property: "og:url", content: m.url },
		{ property: "og:image", content: m.image },
		{ property: "og:image:alt", content: m.imageAlt },
		{ property: "og:image:width", content: "1200" },
		{ property: "og:image:height", content: "630" },
		{
			property: "place:location:latitude",
			content: String(g.location.coordinates[1]),
		},
		{
			property: "place:location:longitude",
			content: String(g.location.coordinates[0]),
		},
		{ name: "twitter:card", content: "summary_large_image" },
		{ name: "twitter:title", content: g.name },
		{ name: "twitter:description", content: m.description },
		{ name: "twitter:image", content: m.image },
	];
}

/**
 * schema.org structured data. Coordinates are whatever the API exposed, so
 * sensitive geosites are already rounded to ~1 km here.
 */
export function geositeJsonLd(
	g: Geosite,
	{ imageOk = true }: { imageOk?: boolean } = {},
) {
	const [longitude, latitude] = g.location.coordinates;
	return {
		"@context": "https://schema.org",
		"@type": "TouristAttraction",
		inLanguage: getLocale(),
		name: g.name,
		description: truncate(g.summary || g.description || g.name, 300),
		url: absoluteUrl(geositePath(g.slug)),
		...(imageOk && g.coverImageUrl && { image: g.coverImageUrl }),
		geo: { "@type": "GeoCoordinates", latitude, longitude },
		address: {
			"@type": "PostalAddress",
			addressLocality: g.municipality,
			addressRegion: g.state,
			addressCountry: "BR",
		},
		...(g.categories.length > 0 && {
			keywords: g.categories.map(categoryLabel).join(", "),
		}),
		...(g.geoparkId && {
			containedInPlace: {
				"@type": "Place",
				name: geoparkIdLabel(g.geoparkId),
			},
		}),
		...(g.source && { sameAs: g.source.url }),
	};
}

/** Google Maps directions to a point; works on every phone and opens the app if installed. */
export function directionsUrl([lng, lat]: [number, number]): string {
	const params = new URLSearchParams({
		api: "1",
		destination: `${lat},${lng}`,
	});
	return `https://www.google.com/maps/dir/?${params}`;
}

const escapeXml = (s: string) =>
	s.replace(
		/[<>&'"]/g,
		(c) =>
			`&${{ "<": "lt", ">": "gt", "&": "amp", "'": "apos", '"': "quot" }[c]};`,
	);

/**
 * One `<url>` per page and locale, each listing every language version:
 * the home page, any other fixed pages (e.g. geoparks), then every geosite.
 */
export function sitemapXml(
	geosites: { slug: string; updatedAt?: string }[],
	otherPaths: string[] = [],
): string {
	const pages = [
		{
			path: "/",
			extra: "<changefreq>weekly</changefreq><priority>1.0</priority>",
		},
		...otherPaths.map((path) => ({ path, extra: "" })),
		...geosites.map((g) => ({
			path: geositePath(g.slug),
			extra: g.updatedAt
				? `<lastmod>${g.updatedAt.slice(0, 10)}</lastmod>`
				: "",
		})),
	];
	const urls = pages.flatMap(({ path, extra }) => {
		const alternates = locales
			.map(
				(l) =>
					`<xhtml:link rel="alternate" hreflang="${l}" href="${escapeXml(absoluteUrl(path, l))}"/>`,
			)
			.join("");
		return locales.map(
			(l) =>
				`<url><loc>${escapeXml(absoluteUrl(path, l))}</loc>${extra}${alternates}</url>`,
		);
	});
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>\n`;
}
