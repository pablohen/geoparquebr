import { Anchor, Container, Stack, Title } from "@mantine/core";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { pageMetaTags } from "~/features/geoparks/seo";
import { PageHeader } from "~/features/i18n/components/PageHeader";
import { regionCardPath } from "~/features/share/card-response";
import { RegionView } from "~/features/states/components/RegionView";
import { regionLabel } from "~/features/states/labels";
import { RegionSchema } from "~/features/states/schemas";
import { regionPath } from "~/features/states/states";
import { getRegionPage } from "~/features/states/states.functions";
import { alternateLinks } from "~/lib/i18n";
import { absoluteUrl, SITE_URL } from "~/lib/site";
import { m } from "~/paraglide/messages.js";

/** Indexable page for one of Brazil's five regions. */
export const Route = createFileRoute("/regions/$region")({
	loader: async ({ params }) => {
		const region = RegionSchema.safeParse(params.region);
		if (!region.success) throw notFound();
		const page = await getRegionPage({ data: { region: region.data } });
		if (!page) throw notFound();
		return page;
	},
	head: ({ loaderData }) => {
		if (!loaderData) return {};
		const name = regionLabel(loaderData.region);
		const path = regionPath(loaderData.region);
		return {
			meta: pageMetaTags(
				m.region_meta_title({ name }),
				m.region_meta_description({ name }),
				path,
				absoluteUrl(regionCardPath(loaderData.region)),
			),
			links: [
				{ rel: "canonical", href: absoluteUrl(path) },
				...alternateLinks(path, SITE_URL),
			],
		};
	},
	component: RegionPageRoute,
	notFoundComponent: () => (
		<Container component="main" size="md" px={{ base: "sm", sm: "md" }} py="md">
			<PageHeader />
			<Stack gap={6}>
				<Title order={1} size="h2">
					{m.region_not_found()}
				</Title>
				<Anchor component={Link} to="/regions">
					{m.region_all()}
				</Anchor>
			</Stack>
		</Container>
	),
});

function RegionPageRoute() {
	const page = Route.useLoaderData();
	return (
		<Container component="main" size="md" px={{ base: "sm", sm: "md" }} py="md">
			<PageHeader />
			<RegionView page={page} />
		</Container>
	);
}
