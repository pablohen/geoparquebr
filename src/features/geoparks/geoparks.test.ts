import { afterEach, describe, expect, it } from "vitest";
import {
	BBoxSchema,
	GEOPARK_IDS,
	type GeoparkId,
} from "~/features/geosites/schemas";
import { sitemapXml } from "~/features/geosites/seo";
import { baseLocale, overwriteGetLocale } from "~/paraglide/runtime.js";
import { GEOPARKS, geoparkPath } from "./geoparks";
import type { GeoparkGeosite } from "./schemas";
import { geoparkJsonLd, geoparkMetaTags } from "./seo";

describe("GEOPARKS", () => {
	it("covers every geopark id with a valid map area", () => {
		expect(Object.keys(GEOPARKS).sort()).toEqual([...GEOPARK_IDS].sort());
		for (const id of GEOPARK_IDS) {
			const { area, designated } = GEOPARKS[id as GeoparkId];
			expect(BBoxSchema.safeParse([...area]).success, id).toBe(true);
			expect(designated).toBeGreaterThanOrEqual(2006);
		}
	});
});

const site: GeoparkGeosite = {
	id: "1",
	slug: "pedra-cariri",
	name: "Pedra Cariri",
	municipality: "Nova Olinda",
	state: "CE",
	categories: ["paleontological"],
	relevance: "international",
	location: { type: "Point", coordinates: [-39.69, -7.12] },
	locationIsSensitive: true,
};

describe("geopark SEO", () => {
	afterEach(() => overwriteGetLocale(() => baseLocale));

	it("describes the geopark and the geosites in it", () => {
		expect(geoparkJsonLd("araripe", [site])).toMatchObject({
			"@type": "TouristDestination",
			name: "Geoparque Araripe (CE)",
			url: "https://geoparquebr.vercel.app/geoparks/araripe",
			containsPlace: [
				{
					name: "Pedra Cariri",
					url: "https://geoparquebr.vercel.app/geosites/pedra-cariri",
				},
			],
		});
		expect(geoparkJsonLd("quarta-colonia", [])).not.toHaveProperty(
			"containsPlace",
		);
	});

	it("titles and links the page in the current language", () => {
		overwriteGetLocale(() => "es");
		const tags = geoparkMetaTags("uberaba");
		expect(tags).toContainEqual({
			title: "Geoparque Uberaba – Tierra de Gigantes (MG) — GeoparqueBR",
		});
		expect(tags).toContainEqual({
			property: "og:url",
			content: "https://geoparquebr.vercel.app/es/geoparks/uberaba",
		});
	});

	it("lists geopark pages in the sitemap in every language", () => {
		const xml = sitemapXml([], ["/geoparks", geoparkPath("serido")]);
		for (const prefix of ["", "/en", "/es"])
			expect(xml).toContain(
				`<loc>https://geoparquebr.vercel.app${prefix}/geoparks/serido</loc>`,
			);
		expect(xml).toContain("<loc>https://geoparquebr.vercel.app/geoparks</loc>");
	});
});
