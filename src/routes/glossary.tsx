import { Container } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { pageMetaTags } from "~/features/geoparks/seo";
import { GlossaryView } from "~/features/glossary/components/GlossaryView";
import { GLOSSARY_PATH } from "~/features/glossary/glossary";
import { PageHeader } from "~/features/i18n/components/PageHeader";
import { pageCardPath } from "~/features/share/card-response";
import { alternateLinks } from "~/lib/i18n";
import { absoluteUrl, SITE_URL } from "~/lib/site";
import { m } from "~/paraglide/messages.js";

/** Plain-language definitions of the terms the app uses. */
export const Route = createFileRoute("/glossary")({
	head: () => ({
		meta: pageMetaTags(
			m.glossary_title(),
			m.glossary_intro(),
			GLOSSARY_PATH,
			absoluteUrl(pageCardPath("glossary")),
		),
		links: [
			{ rel: "canonical", href: absoluteUrl(GLOSSARY_PATH) },
			...alternateLinks(GLOSSARY_PATH, SITE_URL),
		],
	}),
	component: GlossaryPage,
});

function GlossaryPage() {
	return (
		<Container component="main" size="md" px={{ base: "sm", sm: "md" }} py="md">
			<PageHeader />
			<GlossaryView />
		</Container>
	);
}
