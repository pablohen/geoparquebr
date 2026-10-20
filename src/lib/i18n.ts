/**
 * Locale helpers shared by pages and SEO. pt-BR lives at the root and English
 * under /en (Paraglide's URL strategy); see the rewrite in router.tsx.
 */
import {
	baseLocale,
	getLocale,
	type Locale,
	locales,
	localizeUrl,
} from "~/paraglide/runtime.js";

export { baseLocale, getLocale, type Locale, locales };

/** Open Graph `og:locale` value for a locale. */
export const OG_LOCALES = {
	"pt-BR": "pt_BR",
	en: "en_US",
} as const satisfies Record<Locale, string>;

/** A path on `origin` in the given locale, e.g. /geosites/x → https://…/en/geosites/x. */
export function localizedUrl(
	path: string,
	origin: string,
	locale: Locale = getLocale(),
): string {
	return localizeUrl(new URL(path, origin), { locale }).href;
}

/** hreflang alternates for one page: every locale plus x-default (pt-BR). */
export function alternateLinks(path: string, origin: string) {
	return [
		...locales.map((locale) => ({
			rel: "alternate",
			hrefLang: locale,
			href: localizedUrl(path, origin, locale),
		})),
		{
			rel: "alternate",
			hrefLang: "x-default",
			href: localizedUrl(path, origin, baseLocale),
		},
	];
}
