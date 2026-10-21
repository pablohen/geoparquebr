import { createFileRoute } from "@tanstack/react-router";
import { GEOPARKS, geoparkPath } from "~/features/geoparks/geoparks";
import { GEOPARKS_INDEX_PATH } from "~/features/geoparks/seo";
import type { GeoparkId } from "~/features/geosites/schemas";
import { sitemapXml } from "~/features/geosites/seo";

export const Route = createFileRoute("/sitemap.xml")({
	server: {
		handlers: {
			GET: async () => {
				// Loaded lazily so the Mongo driver stays out of the client graph.
				const { listGeositeSlugs } = await import(
					"~/features/geosites/geosites.server"
				);
				const geoparks = (Object.keys(GEOPARKS) as GeoparkId[]).map(
					geoparkPath,
				);
				const xml = sitemapXml(await listGeositeSlugs(), [
					GEOPARKS_INDEX_PATH,
					...geoparks,
				]);
				return new Response(xml, {
					headers: {
						"Content-Type": "application/xml; charset=utf-8",
						"Cache-Control": "public, max-age=0, s-maxage=86400",
					},
				});
			},
		},
	},
});
