import { Container } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { ConservationView } from "~/features/conservation/components/ConservationView";
import { getConservation } from "~/features/conservation/conservation.functions";
import { CONSERVATION_PATH } from "~/features/conservation/schemas";
import { pageMetaTags } from "~/features/geoparks/seo";
import { PageHeader } from "~/features/i18n/components/PageHeader";
import { alternateLinks } from "~/lib/i18n";
import { absoluteUrl, SITE_URL } from "~/lib/site";
import { m } from "~/paraglide/messages.js";

/** High-risk geosites and how to visit responsibly. */
export const Route = createFileRoute("/conservation")({
	loader: () => getConservation(),
	head: () => ({
		meta: pageMetaTags(
			m.conservation_title(),
			m.conservation_intro(),
			CONSERVATION_PATH,
		),
		links: [
			{ rel: "canonical", href: absoluteUrl(CONSERVATION_PATH) },
			...alternateLinks(CONSERVATION_PATH, SITE_URL),
		],
	}),
	component: ConservationPage,
});

function ConservationPage() {
	const data = Route.useLoaderData();
	return (
		<Container component="main" size="md" px={{ base: "sm", sm: "md" }} py="md">
			<PageHeader />
			<ConservationView data={data} />
		</Container>
	);
}
