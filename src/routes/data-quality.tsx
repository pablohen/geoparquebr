import { Container } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { pageMetaTags } from "~/features/geoparks/seo";
import { PageHeader } from "~/features/i18n/components/PageHeader";
import { DataQualityView } from "~/features/quality/components/DataQualityView";
import { getDataQuality } from "~/features/quality/quality.functions";
import { QUALITY_PATH } from "~/features/quality/schemas";
import { pageCardPath } from "~/features/share/card-response";
import { alternateLinks } from "~/lib/i18n";
import { absoluteUrl, SITE_URL } from "~/lib/site";
import { m } from "~/paraglide/messages.js";

/** What GEOSSIT's records get wrong or leave out, to fix at the source. */
export const Route = createFileRoute("/data-quality")({
	loader: () => getDataQuality(),
	head: () => ({
		meta: pageMetaTags(
			m.quality_title(),
			m.quality_intro(),
			QUALITY_PATH,
			absoluteUrl(pageCardPath("data-quality")),
		),
		links: [
			{ rel: "canonical", href: absoluteUrl(QUALITY_PATH) },
			...alternateLinks(QUALITY_PATH, SITE_URL),
		],
	}),
	component: DataQualityPage,
});

function DataQualityPage() {
	const data = Route.useLoaderData();
	return (
		<Container component="main" size="md" px={{ base: "sm", sm: "md" }} py="md">
			<PageHeader />
			<DataQualityView data={data} />
		</Container>
	);
}
