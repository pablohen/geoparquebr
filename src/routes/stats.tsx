import { Container } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { pageMetaTags } from "~/features/geoparks/seo";
import { PageHeader } from "~/features/i18n/components/PageHeader";
import { StatsView } from "~/features/stats/components/StatsView";
import { STATS_PATH } from "~/features/stats/schemas";
import { getGeositeStats } from "~/features/stats/stats.functions";
import { alternateLinks } from "~/lib/i18n";
import { absoluteUrl, SITE_URL } from "~/lib/site";
import { m } from "~/paraglide/messages.js";

/** Números: Brazil's geosites counted. */
export const Route = createFileRoute("/stats")({
	loader: () => getGeositeStats(),
	head: () => ({
		meta: pageMetaTags(m.stats_title(), m.stats_intro(), STATS_PATH),
		links: [
			{ rel: "canonical", href: absoluteUrl(STATS_PATH) },
			...alternateLinks(STATS_PATH, SITE_URL),
		],
	}),
	component: Page,
});

function Page() {
	const stats = Route.useLoaderData();
	return (
		<Container component="main" size="md" px={{ base: "sm", sm: "md" }} py="md">
			<PageHeader />
			<StatsView stats={stats} />
		</Container>
	);
}
