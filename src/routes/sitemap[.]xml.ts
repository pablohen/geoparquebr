import { createFileRoute } from "@tanstack/react-router";
import { FOSSILS_INDEX_PATH, genusPath } from "~/features/fossils/seo";
import { GEOPARKS, geoparkPath } from "~/features/geoparks/geoparks";
import { GEOPARKS_INDEX_PATH } from "~/features/geoparks/seo";
import type { GeoparkId } from "~/features/geosites/schemas";
import { sitemapXml } from "~/features/geosites/seo";
import { GLOSSARY_PATH } from "~/features/glossary/glossary";
import { NEWS_PATH } from "~/features/news/schemas";
import { RANKINGS_PATH } from "~/features/rankings/schemas";
import {
	COMPARE_PATH,
	STATS_PATH,
	TIMELINE_PATH,
} from "~/features/stats/schemas";

export const Route = createFileRoute("/sitemap.xml")({
	server: {
		handlers: {
			GET: async () => {
				// Loaded lazily so the Mongo driver stays out of the client graph.
				const [{ listGeositeSlugs }, { listFossilGenusPages }] =
					await Promise.all([
						import("~/features/geosites/geosites.server"),
						import("~/features/fossils/fossils.server"),
					]);
				const geoparks = (Object.keys(GEOPARKS) as GeoparkId[]).map(
					geoparkPath,
				);
				const genera = await listFossilGenusPages();
				const xml = sitemapXml(await listGeositeSlugs(), [
					GEOPARKS_INDEX_PATH,
					COMPARE_PATH,
					...geoparks,
					FOSSILS_INDEX_PATH,
					NEWS_PATH,
					TIMELINE_PATH,
					STATS_PATH,
					RANKINGS_PATH,
					GLOSSARY_PATH,
					...genera.map((g) => genusPath(g.slug)),
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
