import { Container } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { GeoparksIndex } from "~/features/geoparks/components/GeoparksIndex";
import { getGeoparkCounts } from "~/features/geoparks/geoparks.functions";
import {
	GEOPARKS_INDEX_PATH,
	geoparksIndexMetaTags,
} from "~/features/geoparks/seo";
import { PageHeader } from "~/features/i18n/components/PageHeader";
import { alternateLinks } from "~/lib/i18n";
import { absoluteUrl, SITE_URL } from "~/lib/site";

/** Brazil's UNESCO Global Geoparks, each linking to its own page. */
export const Route = createFileRoute("/geoparks/")({
	loader: () => getGeoparkCounts(),
	head: () => ({
		meta: geoparksIndexMetaTags(),
		links: [
			{ rel: "canonical", href: absoluteUrl(GEOPARKS_INDEX_PATH) },
			...alternateLinks(GEOPARKS_INDEX_PATH, SITE_URL),
		],
	}),
	component: GeoparksPage,
});

function GeoparksPage() {
	const counts = Route.useLoaderData();
	return (
		<Container size="md" px={{ base: "sm", sm: "md" }} py="md">
			<PageHeader />
			<GeoparksIndex counts={counts} />
		</Container>
	);
}
