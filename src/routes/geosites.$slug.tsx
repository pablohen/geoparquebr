import { Anchor, Container, Group, Stack, Text, Title } from "@mantine/core";
import { Mountains } from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { GeositeActions } from "~/features/geosites/components/GeositeActions";
import {
	GeositeDetail,
	geoparkLabel,
} from "~/features/geosites/components/GeositeDetail";
import { getGeositePage } from "~/features/geosites/geosites.functions";
import { ExplorerSearchSchema } from "~/features/geosites/schemas";
import {
	geositeJsonLd,
	geositeMeta,
	geositeMetaTags,
} from "~/features/geosites/seo";

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
					meta: geositeMetaTags(loaderData.geosite, {
						imageOk: loaderData.shareImageOk,
					}),
					links: [
						{ rel: "canonical", href: geositeMeta(loaderData.geosite).url },
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
				Geossítio não encontrado
			</Title>
			<Anchor component={Link} to="/">
				Voltar ao mapa
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
			<Group justify="space-between" mb="lg">
				<Anchor component={Link} to="/" underline="never" c="inherit">
					<Group gap={6}>
						<Mountains
							size={22}
							weight="duotone"
							color="var(--mantine-primary-color-filled)"
							aria-hidden
						/>
						<Text fw={700}>GeoparqueBR</Text>
					</Group>
				</Anchor>
			</Group>

			<Stack gap={4} mb="md">
				<Title order={1} size="h2">
					{geosite.name}
				</Title>
				<Text c="dimmed">
					{geosite.municipality} – {geosite.state} · {geoparkLabel(geosite)}
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
