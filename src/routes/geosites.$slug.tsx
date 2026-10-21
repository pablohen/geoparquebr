import { Anchor, Container, Stack, Text, Title } from "@mantine/core";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { GeoparkName } from "~/features/geoparks/components/GeoparkName";
import { GeositeActions } from "~/features/geosites/components/GeositeActions";
import { GeositeDetail } from "~/features/geosites/components/GeositeDetail";
import { getGeositePage } from "~/features/geosites/geosites.functions";
import { ExplorerSearchSchema } from "~/features/geosites/schemas";
import {
	geositeJsonLd,
	geositeMeta,
	geositeMetaTags,
	geositePath,
} from "~/features/geosites/seo";
import { PageHeader } from "~/features/i18n/components/PageHeader";
import { alternateLinks } from "~/lib/i18n";
import { SITE_URL } from "~/lib/site";
import { m } from "~/paraglide/messages.js";

/**
 * Standalone, indexable page for one geosite: server-rendered overview with
 * share previews and structured data. The map view links here and back.
 */
export const Route = createFileRoute("/geosites/$slug")({
	validateSearch: z.object({
		tab: ExplorerSearchSchema.shape.tab,
		model: ExplorerSearchSchema.shape.model,
	}),
	loader: ({ params }) => getGeositePage({ data: { slug: params.slug } }),
	head: ({ loaderData }) =>
		loaderData
			? {
					meta: geositeMetaTags(loaderData.geosite),
					links: [
						{ rel: "canonical", href: geositeMeta(loaderData.geosite).url },
						...alternateLinks(geositePath(loaderData.geosite.slug), SITE_URL),
					],
					scripts: [
						{
							type: "application/ld+json",
							children: JSON.stringify(
								geositeJsonLd(loaderData.geosite, {
									imageOk: loaderData.shareImageOk,
								}),
							),
						},
					],
				}
			: {},
	component: GeositePage,
	notFoundComponent: () => (
		<Container size="sm" py="xl">
			<Title order={1} size="h2">
				{m.not_found_geosite()}
			</Title>
			<Anchor component={Link} to="/">
				{m.back_to_map()}
			</Anchor>
		</Container>
	),
});

function GeositePage() {
	const { geosite } = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();

	return (
		<Container size="md" px={{ base: "sm", sm: "md" }} py="md">
			<PageHeader />

			<Stack gap={4} mb="md">
				<Title order={1} size="h2">
					{geosite.name}
				</Title>
				<Text c="dimmed">
					{geosite.municipality} – {geosite.state} ·{" "}
					<GeoparkName geosite={geosite} />
				</Text>
			</Stack>
			<GeositeActions geosite={geosite} context="page" />

			<Stack mt="lg">
				<GeositeDetail
					geosite={geosite}
					view={{ tab: search.tab, model: search.model }}
					onViewChange={(view) =>
						navigate({
							search: (prev) => ({ ...prev, ...view }),
							replace: true,
							resetScroll: false,
						})
					}
				/>
			</Stack>
		</Container>
	);
}
