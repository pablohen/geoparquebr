import { Anchor, Container, Stack, Title } from "@mantine/core";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { pageMetaTags } from "~/features/geoparks/seo";
import { PageHeader } from "~/features/i18n/components/PageHeader";
import { stateCardPath } from "~/features/share/card-response";
import { StateView } from "~/features/states/components/StateView";
import { UfParamSchema } from "~/features/states/schemas";
import { stateName, statePath } from "~/features/states/states";
import { getStatePage } from "~/features/states/states.functions";
import { alternateLinks } from "~/lib/i18n";
import { absoluteUrl, SITE_URL } from "~/lib/site";
import { m } from "~/paraglide/messages.js";

/** Indexable page for one state's GEOSSIT geosites. */
export const Route = createFileRoute("/states/$uf")({
	loader: async ({ params }) => {
		const uf = UfParamSchema.safeParse(params.uf);
		if (!uf.success) throw notFound();
		const page = await getStatePage({ data: { uf: uf.data } });
		if (!page) throw notFound();
		return page;
	},
	head: ({ loaderData }) =>
		loaderData
			? {
					meta: pageMetaTags(
						m.state_meta_title({ name: stateName(loaderData.uf) }),
						m.state_meta_description({
							name: stateName(loaderData.uf),
							count: loaderData.tally.total,
						}),
						statePath(loaderData.uf),
						absoluteUrl(stateCardPath(loaderData.uf)),
					),
					links: [
						{ rel: "canonical", href: absoluteUrl(statePath(loaderData.uf)) },
						...alternateLinks(statePath(loaderData.uf), SITE_URL),
					],
				}
			: {},
	component: StatePageRoute,
	notFoundComponent: () => (
		<Container component="main" size="md" px={{ base: "sm", sm: "md" }} py="md">
			<PageHeader />
			<Stack gap={6}>
				<Title order={1} size="h2">
					{m.state_not_found()}
				</Title>
				<Anchor component={Link} to="/states">
					{m.state_all_states()}
				</Anchor>
			</Stack>
		</Container>
	),
});

function StatePageRoute() {
	const page = Route.useLoaderData();
	return (
		<Container component="main" size="md" px={{ base: "sm", sm: "md" }} py="md">
			<PageHeader />
			<StateView page={page} />
		</Container>
	);
}
