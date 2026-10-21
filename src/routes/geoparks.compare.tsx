import { Container } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { pageMetaTags } from "~/features/geoparks/seo";
import { PageHeader } from "~/features/i18n/components/PageHeader";
import { GeoparkCompare } from "~/features/stats/components/GeoparkCompare";
import { COMPARE_PATH } from "~/features/stats/schemas";
import { getGeositeStats } from "~/features/stats/stats.functions";
import { alternateLinks } from "~/lib/i18n";
import { absoluteUrl, SITE_URL } from "~/lib/site";
import { m } from "~/paraglide/messages.js";

/** Brazil's geoparks side by side. */
export const Route = createFileRoute("/geoparks/compare")({
	loader: () => getGeositeStats(),
	head: () => ({
		meta: pageMetaTags(m.compare_title(), m.compare_intro(), COMPARE_PATH),
		links: [
			{ rel: "canonical", href: absoluteUrl(COMPARE_PATH) },
			...alternateLinks(COMPARE_PATH, SITE_URL),
		],
	}),
	component: Page,
});

function Page() {
	const stats = Route.useLoaderData();
	return (
		<Container component="main" size="md" px={{ base: "sm", sm: "md" }} py="md">
			<PageHeader />
			<GeoparkCompare stats={stats} />
		</Container>
	);
}
