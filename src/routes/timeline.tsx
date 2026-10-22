import { Container } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { pageMetaTags } from "~/features/geoparks/seo";
import { PageHeader } from "~/features/i18n/components/PageHeader";
import { pageCardPath } from "~/features/share/card-response";
import { TimelineView } from "~/features/stats/components/TimelineView";
import { TIMELINE_PATH } from "~/features/stats/schemas";
import { getTimeline } from "~/features/stats/stats.functions";
import { alternateLinks } from "~/lib/i18n";
import { absoluteUrl, SITE_URL } from "~/lib/site";
import { m } from "~/paraglide/messages.js";

/** Linha do tempo: geosites by geological period. */
export const Route = createFileRoute("/timeline")({
	loader: () => getTimeline(),
	head: () => ({
		meta: pageMetaTags(
			m.timeline_title(),
			m.timeline_intro(),
			TIMELINE_PATH,
			absoluteUrl(pageCardPath("timeline")),
		),
		links: [
			{ rel: "canonical", href: absoluteUrl(TIMELINE_PATH) },
			...alternateLinks(TIMELINE_PATH, SITE_URL),
		],
	}),
	component: Page,
});

function Page() {
	const timeline = Route.useLoaderData();
	return (
		<Container component="main" size="md" px={{ base: "sm", sm: "md" }} py="md">
			<PageHeader />
			<TimelineView timeline={timeline} />
		</Container>
	);
}
