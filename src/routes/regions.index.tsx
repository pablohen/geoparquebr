import { Container } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { pageMetaTags } from "~/features/geoparks/seo";
import { PageHeader } from "~/features/i18n/components/PageHeader";
import { pageCardPath } from "~/features/share/card-response";
import { RegionsIndex } from "~/features/states/components/RegionsIndex";
import { REGIONS_PATH } from "~/features/states/states";
import { getGeositeStats } from "~/features/stats/stats.functions";
import { alternateLinks } from "~/lib/i18n";
import { absoluteUrl, SITE_URL } from "~/lib/site";
import { m } from "~/paraglide/messages.js";

/** Brazil's five regions, each linking to its geosites. */
export const Route = createFileRoute("/regions/")({
	loader: () => getGeositeStats(),
	head: () => ({
		meta: pageMetaTags(
			m.regions_title(),
			m.regions_intro(),
			REGIONS_PATH,
			absoluteUrl(pageCardPath("regions")),
		),
		links: [
			{ rel: "canonical", href: absoluteUrl(REGIONS_PATH) },
			...alternateLinks(REGIONS_PATH, SITE_URL),
		],
	}),
	component: RegionsPage,
});

function RegionsPage() {
	const stats = Route.useLoaderData();
	return (
		<Container component="main" size="md" px={{ base: "sm", sm: "md" }} py="md">
			<PageHeader />
			<RegionsIndex stats={stats} />
		</Container>
	);
}
