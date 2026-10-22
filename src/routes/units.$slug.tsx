import { Anchor, Container, Stack, Title } from "@mantine/core";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { pageMetaTags } from "~/features/geoparks/seo";
import { PageHeader } from "~/features/i18n/components/PageHeader";
import { UnitView } from "~/features/units/components/UnitView";
import { UnitSlugSchema } from "~/features/units/schemas";
import { unitPath } from "~/features/units/units";
import { getUnit } from "~/features/units/units.functions";
import { alternateLinks } from "~/lib/i18n";
import { absoluteUrl, SITE_URL } from "~/lib/site";
import { m } from "~/paraglide/messages.js";

/** Indexable page for one rock unit mapped at geosites. */
export const Route = createFileRoute("/units/$slug")({
	loader: async ({ params }) => {
		const slug = UnitSlugSchema.safeParse(params.slug);
		if (!slug.success) throw notFound();
		const unit = await getUnit({ data: { slug: slug.data } });
		if (!unit) throw notFound();
		return unit;
	},
	head: ({ loaderData }) =>
		loaderData
			? {
					meta: pageMetaTags(
						loaderData.name,
						m.unit_meta_description({
							name: loaderData.name,
							count: loaderData.geositeCount,
						}),
						unitPath(loaderData.slug),
					),
					links: [
						{ rel: "canonical", href: absoluteUrl(unitPath(loaderData.slug)) },
						...alternateLinks(unitPath(loaderData.slug), SITE_URL),
					],
				}
			: {},
	component: UnitPageRoute,
	notFoundComponent: () => (
		<Container component="main" size="md" px={{ base: "sm", sm: "md" }} py="md">
			<PageHeader />
			<Stack gap={6}>
				<Title order={1} size="h2">
					{m.unit_not_found()}
				</Title>
				<Anchor component={Link} to="/units">
					{m.unit_all_units()}
				</Anchor>
			</Stack>
		</Container>
	),
});

function UnitPageRoute() {
	const unit = Route.useLoaderData();
	return (
		<Container component="main" size="md" px={{ base: "sm", sm: "md" }} py="md">
			<PageHeader />
			<UnitView unit={unit} />
		</Container>
	);
}
