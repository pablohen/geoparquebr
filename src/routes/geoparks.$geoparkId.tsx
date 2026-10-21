import { Anchor, Container, Stack, Title } from "@mantine/core";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { GeoparkView } from "~/features/geoparks/components/GeoparkView";
import { geoparkPath } from "~/features/geoparks/geoparks";
import { getGeoparkGeosites } from "~/features/geoparks/geoparks.functions";
import { geoparkJsonLd, geoparkMetaTags } from "~/features/geoparks/seo";
import { GeoparkIdSchema } from "~/features/geosites/schemas";
import { PageHeader } from "~/features/i18n/components/PageHeader";
import { alternateLinks } from "~/lib/i18n";
import { absoluteUrl, SITE_URL } from "~/lib/site";
import { m } from "~/paraglide/messages.js";

/** Indexable page for one UNESCO Global Geopark and its GEOSSIT geosites. */
export const Route = createFileRoute("/geoparks/$geoparkId")({
	loader: async ({ params }) => {
		const id = GeoparkIdSchema.safeParse(params.geoparkId);
		if (!id.success) throw notFound();
		return {
			id: id.data,
			geosites: await getGeoparkGeosites({ data: { id: id.data } }),
		};
	},
	head: ({ loaderData }) =>
		loaderData
			? {
					meta: geoparkMetaTags(loaderData.id),
					links: [
						{ rel: "canonical", href: absoluteUrl(geoparkPath(loaderData.id)) },
						...alternateLinks(geoparkPath(loaderData.id), SITE_URL),
					],
					scripts: [
						{
							type: "application/ld+json",
							children: JSON.stringify(
								geoparkJsonLd(loaderData.id, loaderData.geosites),
							),
						},
					],
				}
			: {},
	component: GeoparkPage,
	notFoundComponent: () => (
		<Container component="main" size="md" px={{ base: "sm", sm: "md" }} py="md">
			<PageHeader />
			<Stack gap={6}>
				<Title order={1} size="h2">
					{m.geopark_not_found()}
				</Title>
				<Anchor component={Link} to="/geoparks/">
					{m.geopark_all_geoparks()}
				</Anchor>
			</Stack>
		</Container>
	),
});

function GeoparkPage() {
	const { id, geosites } = Route.useLoaderData();
	return (
		<Container component="main" size="md" px={{ base: "sm", sm: "md" }} py="md">
			<PageHeader />
			<GeoparkView id={id} geosites={geosites} />
		</Container>
	);
}
