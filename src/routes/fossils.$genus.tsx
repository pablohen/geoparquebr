import { Anchor, Container, Stack, Title } from "@mantine/core";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { FossilGenusView } from "~/features/fossils/components/FossilGenusView";
import { getFossilGenus } from "~/features/fossils/fossils.functions";
import { GenusSlugSchema } from "~/features/fossils/schemas";
import { genusJsonLd, genusMetaTags, genusPath } from "~/features/fossils/seo";
import { PageHeader } from "~/features/i18n/components/PageHeader";
import { alternateLinks } from "~/lib/i18n";
import { absoluteUrl, SITE_URL } from "~/lib/site";
import { m } from "~/paraglide/messages.js";

/** Indexable page for one fossil genus recorded near geosites. */
export const Route = createFileRoute("/fossils/$genus")({
	loader: ({ params }) => {
		const slug = GenusSlugSchema.safeParse(params.genus);
		if (!slug.success) throw notFound();
		return getFossilGenus({ data: { slug: slug.data } });
	},
	head: ({ loaderData }) =>
		loaderData
			? {
					meta: genusMetaTags(loaderData),
					links: [
						{ rel: "canonical", href: absoluteUrl(genusPath(loaderData.slug)) },
						...alternateLinks(genusPath(loaderData.slug), SITE_URL),
					],
					scripts: [
						{
							type: "application/ld+json",
							children: JSON.stringify(genusJsonLd(loaderData)),
						},
					],
				}
			: {},
	component: GenusPage,
	notFoundComponent: () => (
		<Container component="main" size="md" px={{ base: "sm", sm: "md" }} py="md">
			<PageHeader />
			<Stack gap={6}>
				<Title order={1} size="h2">
					{m.fossils_not_found()}
				</Title>
				<Anchor component={Link} to="/fossils/">
					{m.fossils_all_genera()}
				</Anchor>
			</Stack>
		</Container>
	),
});

function GenusPage() {
	const genus = Route.useLoaderData();
	return (
		<Container component="main" size="md" px={{ base: "sm", sm: "md" }} py="md">
			<PageHeader />
			<FossilGenusView genus={genus} />
		</Container>
	);
}
