/**
 * Locale helpers shared by pages and SEO. pt-BR lives at the root, English
 * under /en and Spanish under /es (Paraglide's URL strategy); see the
 * rewrite in router.tsx.
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
	es: "es_LA",
} as const satisfies Record<Locale, string>;

/** Each language's own name, for the language menu; the same in every locale. */
export const LOCALE_NAMES = {
	"pt-BR": "Português",
	en: "English",
	es: "Español",
} as const satisfies Record<Locale, string>;

/** Short code shown on the language button. */
export const LOCALE_CODES = {
	"pt-BR": "PT",
	en: "EN",
	es: "ES",
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
