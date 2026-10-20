/** Public origin, used for canonical URLs, share links and the sitemap. */
export const SITE_URL = "https://geoparquebr.vercel.app";

export const SITE_NAME = "GeoparqueBR";

export const SITE_DESCRIPTION =
	"Explore geossítios, fósseis, estratos e cavernas dos geoparques e do patrimônio geológico do Brasil.";

/** Fallback share image (1200×630) for pages without their own photo. */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

export const absoluteUrl = (path: string) => new URL(path, SITE_URL).toString();
