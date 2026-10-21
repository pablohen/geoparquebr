import { Anchor, Box, Container } from "@mantine/core";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { geoparkIdLabel } from "~/features/geosites/labels";
import { GeoparkIdSchema } from "~/features/geosites/schemas";
import { FieldGuide, GuideBack } from "~/features/guide/components/FieldGuide";
import { getGeoparkGuide } from "~/features/guide/guide.functions";
import { PageHeader } from "~/features/i18n/components/PageHeader";
import { getLocale } from "~/lib/i18n";
import { SITE_NAME } from "~/lib/site";
import { m } from "~/paraglide/messages.js";

/** Printable field guide for one geopark's geosites (not indexed). */
export const Route = createFileRoute("/geoparks/$geoparkId_/guide")({
	loader: async ({ params }) => {
		const id = GeoparkIdSchema.safeParse(params.geoparkId);
		if (!id.success) throw notFound();
		return {
			id: id.data,
			entries: await getGeoparkGuide({
				data: { id: id.data, locale: getLocale() },
			}),
		};
	},
	head: ({ loaderData }) => ({
		meta: [
			{
				title: `${m.guide_eyebrow()}: ${loaderData ? geoparkIdLabel(loaderData.id) : ""} — ${SITE_NAME}`,
			},
			{ name: "robots", content: "noindex" },
		],
	}),
	component: GeoparkGuidePage,
});

function GeoparkGuidePage() {
	const { id, entries } = Route.useLoaderData();
	return (
		<Container component="main" size="md" px={{ base: "sm", sm: "md" }} py="md">
			<Box data-print-hide>
				<PageHeader />
			</Box>
			<FieldGuide
				title={geoparkIdLabel(id)}
				entries={entries}
				back={
					<Anchor
						size="sm"
						renderRoot={(props) => (
							<Link
								{...props}
								to="/geoparks/$geoparkId"
								params={{ geoparkId: id }}
							/>
						)}
					>
						<GuideBack>{m.guide_back()}</GuideBack>
					</Anchor>
				}
			/>
		</Container>
	);
}
