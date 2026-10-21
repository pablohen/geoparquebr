import { createFileRoute } from "@tanstack/react-router";
import maplibreCss from "maplibre-gl/dist/maplibre-gl.css?url";
import { EmbedFrame } from "~/features/embed/components/EmbedFrame";
import { getGeositeBySlug } from "~/features/geosites/geosites.functions";
import { geositePath } from "~/features/geosites/seo";
import { absoluteUrl, SITE_NAME } from "~/lib/site";
import { m } from "~/paraglide/messages.js";

/** Embeddable map of one geosite (its public point), for other sites' `<iframe>`s. */
export const Route = createFileRoute("/embed/geosites/$slug")({
	loader: ({ params }) => getGeositeBySlug({ data: { slug: params.slug } }),
	head: ({ loaderData }) => ({
		meta: [
			{ title: `${loaderData?.name ?? ""} — ${SITE_NAME}` },
			{ name: "robots", content: "noindex" },
		],
		links: [{ rel: "stylesheet", href: maplibreCss }],
	}),
	component: GeositeEmbed,
	notFoundComponent: () => m.embed_not_found(),
});

function GeositeEmbed() {
	const g = Route.useLoaderData();
	const url = absoluteUrl(geositePath(g.slug));
	return (
		<EmbedFrame
			title={g.name}
			pageUrl={url}
			points={[
				{ slug: g.slug, name: g.name, point: g.location.coordinates, url },
			]}
		/>
	);
}
