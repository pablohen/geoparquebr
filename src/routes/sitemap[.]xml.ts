import { createFileRoute } from "@tanstack/react-router";
import { sitemapXml } from "~/features/geosites/seo";

export const Route = createFileRoute("/sitemap.xml")({
	server: {
		handlers: {
			GET: async () => {
				// Loaded lazily so the Mongo driver stays out of the client graph.
				const { listGeositeSlugs } = await import(
					"~/features/geosites/geosites.server"
				);
				return new Response(sitemapXml(await listGeositeSlugs()), {
					headers: {
						"Content-Type": "application/xml; charset=utf-8",
						"Cache-Control": "public, max-age=0, s-maxage=86400",
					},
				});
			},
		},
	},
});
