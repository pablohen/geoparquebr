import { createFileRoute, notFound } from "@tanstack/react-router";
import maplibreCss from "maplibre-gl/dist/maplibre-gl.css?url";
import { EmbedFrame } from "~/features/embed/components/EmbedFrame";
import { geoparkPath } from "~/features/geoparks/geoparks";
import { getGeoparkGeosites } from "~/features/geoparks/geoparks.functions";
import { geoparkIdLabel } from "~/features/geosites/labels";
import { GeoparkIdSchema } from "~/features/geosites/schemas";
import { geositePath } from "~/features/geosites/seo";
import { absoluteUrl, SITE_NAME } from "~/lib/site";
import { m } from "~/paraglide/messages.js";

/** Embeddable map of one geopark's geosites, for other sites' `<iframe>`s. */
export const Route = createFileRoute("/embed/geoparks/$geoparkId")({
	loader: async ({ params }) => {
		const id = GeoparkIdSchema.safeParse(params.geoparkId);
		if (!id.success) throw notFound();
		return {
			id: id.data,
			geosites: await getGeoparkGeosites({ data: { id: id.data } }),
		};
	},
	head: ({ loaderData }) => ({
		meta: [
			{
				title: `${loaderData ? geoparkIdLabel(loaderData.id) : ""} — ${SITE_NAME}`,
			},
			{ name: "robots", content: "noindex" },
		],
		links: [{ rel: "stylesheet", href: maplibreCss }],
	}),
	component: GeoparkEmbed,
	notFoundComponent: () => m.embed_not_found(),
});

function GeoparkEmbed() {
	const { id, geosites } = Route.useLoaderData();
	return (
		<EmbedFrame
			title={geoparkIdLabel(id)}
			pageUrl={absoluteUrl(geoparkPath(id))}
			points={geosites.map((g) => ({
				slug: g.slug,
				name: g.name,
				point: g.location.coordinates,
				url: absoluteUrl(geositePath(g.slug)),
			}))}
		/>
	);
}
