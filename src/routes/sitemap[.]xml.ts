import { createFileRoute } from "@tanstack/react-router";
import { CONSERVATION_PATH } from "~/features/conservation/schemas";
import { FOSSILS_INDEX_PATH, genusPath } from "~/features/fossils/seo";
import { GEOPARKS, geoparkPath } from "~/features/geoparks/geoparks";
import { GEOPARKS_INDEX_PATH } from "~/features/geoparks/seo";
import type { GeoparkId } from "~/features/geosites/schemas";
import { sitemapXml } from "~/features/geosites/seo";
import { GLOSSARY_PATH } from "~/features/glossary/glossary";
import { NEWS_PATH } from "~/features/news/schemas";
import { RANKINGS_PATH } from "~/features/rankings/schemas";
import {
	REGION_IDS,
	REGIONS_PATH,
	regionOf,
	regionPath,
	STATES_PATH,
	statePath,
} from "~/features/states/states";
import {
	COMPARE_PATH,
	STATS_PATH,
	TIMELINE_PATH,
} from "~/features/stats/schemas";
import { UNITS_PATH, unitPath } from "~/features/units/units";

export const Route = createFileRoute("/sitemap.xml")({
	server: {
		handlers: {
			GET: async () => {
				// Loaded lazily so the Mongo driver stays out of the client graph.
				const [
					{ listGeositeSlugs, listGeositeStates },
					{ listFossilGenusPages },
					{ listUnits },
				] = await Promise.all([
					import("~/features/geosites/geosites.server"),
					import("~/features/fossils/fossils.server"),
					import("~/features/units/units.server"),
				]);
				const geoparks = (Object.keys(GEOPARKS) as GeoparkId[]).map(
					geoparkPath,
				);
				const [genera, states, units] = await Promise.all([
					listFossilGenusPages(),
					listGeositeStates(),
					listUnits(),
				]);
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
					STATES_PATH,
					...states.map(statePath),
					REGIONS_PATH,
					...REGION_IDS.filter((r) =>
						states.some((uf) => regionOf(uf) === r),
					).map(regionPath),
					UNITS_PATH,
					CONSERVATION_PATH,
					...units.map((u) => unitPath(u.slug)),
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
