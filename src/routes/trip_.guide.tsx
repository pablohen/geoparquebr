import { Anchor, Box, Center, Container, Loader } from "@mantine/core";
import { useMounted } from "@mantine/hooks";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FieldGuide, GuideBack } from "~/features/guide/components/FieldGuide";
import { getGuideEntries } from "~/features/guide/guide.functions";
import { PageHeader } from "~/features/i18n/components/PageHeader";
import { useTrip } from "~/features/trip/store";
import { getLocale } from "~/lib/i18n";
import { SITE_NAME } from "~/lib/site";
import { useServerQuery } from "~/lib/use-server-query";
import { m } from "~/paraglide/messages.js";

/** Printable field guide for this device's trip, in trip order (not indexed). */
export const Route = createFileRoute("/trip_/guide")({
	head: () => ({
		meta: [
			{ title: `${m.guide_eyebrow()}: ${m.trip_title()} — ${SITE_NAME}` },
			{ name: "robots", content: "noindex" },
		],
	}),
	component: TripGuidePage,
});

function TripGuidePage() {
	// The trip lives in this browser, so the guide loads after mount.
	const mounted = useMounted();
	return (
		<Container component="main" size="md" px={{ base: "sm", sm: "md" }} py="md">
			<Box data-print-hide>
				<PageHeader />
			</Box>
			{mounted ? (
				<TripGuide />
			) : (
				<Center py="xl">
					<Loader type="dots" />
				</Center>
			)}
		</Container>
	);
}

function TripGuide() {
	const { trip } = useTrip();
	const slugs = trip.map((s) => s.slug);
	const query = useServerQuery(`guide:${slugs.join(",")}`, () =>
		slugs.length > 0
			? getGuideEntries({ data: { slugs, locale: getLocale() } })
			: Promise.resolve([]),
	);
	if (query.status !== "success")
		return (
			<Center py="xl">
				<Loader type="dots" />
			</Center>
		);
	return (
		<FieldGuide
			title={m.trip_title()}
			entries={query.data}
			back={
				<Anchor
					size="sm"
					renderRoot={(props) => <Link {...props} to="/trip" />}
				>
					<GuideBack>{m.guide_back()}</GuideBack>
				</Anchor>
			}
		/>
	);
}
