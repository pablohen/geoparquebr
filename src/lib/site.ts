import { type Locale, localizedUrl } from "./i18n";

/** Public origin, used for canonical URLs, share links and the sitemap. */
export const SITE_URL = "https://geoparquebr.vercel.app";

export const SITE_NAME = "GeoparqueBR";

/** Fallback share image (1200×630) for pages without their own photo. */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

/** Public URL of a path, in the current locale unless one is given. */
export const absoluteUrl = (path: string, locale?: Locale) =>
	localizedUrl(path, SITE_URL, locale);
