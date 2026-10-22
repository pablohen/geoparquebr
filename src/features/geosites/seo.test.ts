import { afterEach, describe, expect, it } from "vitest";
import { baseLocale, overwriteGetLocale } from "~/paraglide/runtime.js";
import type { Geosite } from "./schemas";
import {
	directionsUrl,
	geositeJsonLd,
	geositeMeta,
	geositeMetaTags,
	geositePath,
	sitemapXml,
	truncate,
} from "./seo";

const base: Geosite = {
	id: "1",
	slug: "pedra-cariri",
	name: "Pedra Cariri",
	summary:
		"Lavras de calcário laminado da Formação Crato com fósseis excepcionais.",
	municipality: "Nova Olinda",
	state: "CE",
	categories: ["paleontological"],
	relevance: "international",
	location: { type: "Point", coordinates: [-39.69, -7.12] },
	models: [],
	locationIsSensitive: true,
	locationIsApproximate: false,
	geoparkId: "araripe",
	coverImageUrl: "https://www.sgb.gov.br/geossit/img/x.jpg",
	source: {
		system: "geossit",
		id: 1997,
		url: "https://www.sgb.gov.br/geossit/geossitios/ver/1997",
	},
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-10-20T12:00:00.000Z",
};

describe("truncate", () => {
	it("keeps short text and cuts long text at a word boundary", () => {
		expect(truncate("  curto  ", 10)).toBe("curto");
		const cut = truncate("uma frase bem longa sobre geologia", 20);
		expect(cut.length).toBeLessThanOrEqual(20);
		expect(cut).toBe("uma frase bem longa…");
		// A word cut in the middle is dropped rather than shown half.
		expect(truncate("uma frase bem longa sobre geologia", 17)).toBe(
			"uma frase bem…",
		);
	});
});

describe("geositeMeta", () => {
	it("builds title, description with context, canonical URL and image", () => {
		const m = geositeMeta(base);
		expect(m.title).toBe("Pedra Cariri — GeoparqueBR");
		expect(
			m.description.startsWith("Nova Olinda – CE · Geoparque Araripe (CE)."),
		).toBe(true);
		expect(m.description.length).toBeLessThanOrEqual(160);
		expect(m.url).toBe("https://geoparquebr.vercel.app/geosites/pedra-cariri");
		expect(m.image).toBe(
			"https://geoparquebr.vercel.app/og/geosites/pedra-cariri",
		);
	});

	it("describes a geosite without a summary by its context", () => {
		const m = geositeMeta({ ...base, coverImageUrl: undefined, summary: "" });
		expect(m.description).toBe("Nova Olinda – CE · Geoparque Araripe (CE)");
	});

	it("keeps dead photos out of the structured data", () => {
		expect(geositeJsonLd(base, { imageOk: false })).not.toHaveProperty("image");
		expect(geositeJsonLd(base)).toHaveProperty("image", base.coverImageUrl);
	});

	it("shares the generated 1200×630 card, photo or not", () => {
		const tags = geositeMetaTags({ ...base, coverImageUrl: undefined });
		expect(tags).toContainEqual({
			property: "og:image",
			content: "https://geoparquebr.vercel.app/og/geosites/pedra-cariri",
		});
		expect(tags).toContainEqual({
			property: "og:image:width",
			content: "1200",
		});
		expect(tags).toContainEqual({
			property: "og:image:height",
			content: "630",
		});
	});

	it("produces Open Graph and Twitter tags", () => {
		const tags = geositeMetaTags(base);
		const prop = (p: string) =>
			tags.find((t) => "property" in t && t.property === p)?.content;
		expect(prop("og:image:alt")).toBe("Pedra Cariri");
		expect(prop("og:url")).toBe(
			"https://geoparquebr.vercel.app/geosites/pedra-cariri",
		);
		expect(tags).toContainEqual({
			name: "twitter:card",
			content: "summary_large_image",
		});
	});
});

describe("geositeJsonLd", () => {
	it("describes a TouristAttraction with geo, address and source", () => {
		const ld = geositeJsonLd(base);
		expect(ld).toMatchObject({
			"@type": "TouristAttraction",
			name: "Pedra Cariri",
			geo: { latitude: -7.12, longitude: -39.69 },
			address: {
				addressLocality: "Nova Olinda",
				addressRegion: "CE",
				addressCountry: "BR",
			},
			containedInPlace: { name: "Geoparque Araripe (CE)" },
			sameAs: base.source?.url,
			keywords: "Paleontológico",
		});
	});

	it("omits optional fields that are absent", () => {
		const ld = geositeJsonLd({
			...base,
			coverImageUrl: undefined,
			geoparkId: undefined,
			categories: [],
			source: undefined,
		});
		expect(ld).not.toHaveProperty("image");
		expect(ld).not.toHaveProperty("containedInPlace");
		expect(ld).not.toHaveProperty("keywords");
		expect(ld).not.toHaveProperty("sameAs");
	});
});

describe("directionsUrl", () => {
	it("links Google Maps directions to lat,lng", () => {
		expect(directionsUrl([-39.69, -7.12])).toBe(
			"https://www.google.com/maps/dir/?api=1&destination=-7.12%2C-39.69",
		);
	});
});

describe("sitemapXml", () => {
	it("lists the home page and every geosite page in both languages", () => {
		const xml = sitemapXml([
			{ slug: "pedra-cariri", updatedAt: "2026-10-20T12:00:00.000Z" },
			{ slug: "caverna-agua-suja" },
		]);
		expect(xml).toContain("<loc>https://geoparquebr.vercel.app/</loc>");
		expect(xml).toContain("<loc>https://geoparquebr.vercel.app/en/</loc>");
		expect(xml).toContain(
			`<loc>https://geoparquebr.vercel.app${geositePath("pedra-cariri")}</loc><lastmod>2026-10-20</lastmod>`,
		);
		expect(xml).toContain(
			"<loc>https://geoparquebr.vercel.app/en/geosites/caverna-agua-suja</loc><xhtml:link",
		);
		// Three pages × three languages.
		expect(xml.match(/<url>/g)).toHaveLength(9);
		expect(xml).toContain("<loc>https://geoparquebr.vercel.app/es/</loc>");
		expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
	});

	it("links each page to its other language version", () => {
		const xml = sitemapXml([{ slug: "pedra-cariri" }]);
		expect(xml).toContain(
			'<xhtml:link rel="alternate" hreflang="en" href="https://geoparquebr.vercel.app/en/geosites/pedra-cariri"/>',
		);
		expect(xml).toContain(
			'<xhtml:link rel="alternate" hreflang="pt-BR" href="https://geoparquebr.vercel.app/geosites/pedra-cariri"/>',
		);
	});

	it("escapes XML special characters", () => {
		expect(sitemapXml([{ slug: "a&b" }])).toContain("/geosites/a&amp;b");
	});
});

describe("in English", () => {
	afterEach(() => overwriteGetLocale(() => baseLocale));

	it("translates labels and links to the /en page", () => {
		overwriteGetLocale(() => "en");
		const m = geositeMeta(base);
		expect(m.url).toBe(
			"https://geoparquebr.vercel.app/en/geosites/pedra-cariri",
		);
		expect(
			m.description.startsWith("Nova Olinda – CE · Araripe Geopark (CE)."),
		).toBe(true);
		expect(geositeJsonLd(base)).toMatchObject({
			inLanguage: "en",
			keywords: "Paleontological",
			containedInPlace: { name: "Araripe Geopark (CE)" },
		});
		expect(geositeMetaTags(base)).toContainEqual({
			property: "og:locale",
			content: "en_US",
		});
	});
});

describe("in Spanish", () => {
	afterEach(() => overwriteGetLocale(() => baseLocale));

	it("links to the /es page and emits one og:locale", () => {
		overwriteGetLocale(() => "es");
		expect(geositeMeta(base).url).toBe(
			"https://geoparquebr.vercel.app/es/geosites/pedra-cariri",
		);
		// TanStack's head keeps one meta per property; repeats would collapse.
		const locales = geositeMetaTags(base).filter(
			(t) => "property" in t && t.property?.startsWith("og:locale"),
		);
		expect(locales).toEqual([{ property: "og:locale", content: "es_LA" }]);
		expect(geositeJsonLd(base)).toMatchObject({
			inLanguage: "es",
			keywords: "Paleontológico",
		});
	});
});
