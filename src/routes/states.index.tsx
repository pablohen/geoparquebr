import { Container } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { pageMetaTags } from "~/features/geoparks/seo";
import { PageHeader } from "~/features/i18n/components/PageHeader";
import { pageCardPath } from "~/features/share/card-response";
import { StatesIndex } from "~/features/states/components/StatesIndex";
import { STATES_PATH } from "~/features/states/states";
import { getGeositeStats } from "~/features/stats/stats.functions";
import { alternateLinks } from "~/lib/i18n";
import { absoluteUrl, SITE_URL } from "~/lib/site";
import { m } from "~/paraglide/messages.js";

/** Brazil's states, each linking to its geosites. */
export const Route = createFileRoute("/states/")({
	loader: () => getGeositeStats(),
	head: () => ({
		meta: pageMetaTags(
			m.states_title(),
			m.states_intro(),
			STATES_PATH,
			absoluteUrl(pageCardPath("states")),
		),
		links: [
			{ rel: "canonical", href: absoluteUrl(STATES_PATH) },
			...alternateLinks(STATES_PATH, SITE_URL),
		],
	}),
	component: StatesPage,
});

function StatesPage() {
	const stats = Route.useLoaderData();
	return (
		<Container component="main" size="md" px={{ base: "sm", sm: "md" }} py="md">
			<PageHeader />
			<StatesIndex stats={stats} />
		</Container>
	);
}
