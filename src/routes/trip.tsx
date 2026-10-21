import { Container } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "~/features/i18n/components/PageHeader";
import { SharedTripView } from "~/features/trip/components/SharedTripView";
import { TripView } from "~/features/trip/components/TripView";
import { parseTripSlugs, TripSearchSchema } from "~/features/trip/schemas";
import { getTripStops } from "~/features/trip/trip.functions";
import { SITE_NAME } from "~/lib/site";
import { m } from "~/paraglide/messages.js";

/**
 * This device's trip (localStorage), or a shared one from `?stops=a,b,c`.
 * Personal and changeable, so not indexed.
 */
export const Route = createFileRoute("/trip")({
	validateSearch: TripSearchSchema,
	loaderDeps: ({ search }) => ({ slugs: parseTripSlugs(search.stops) }),
	loader: ({ deps }) =>
		deps.slugs.length > 0
			? getTripStops({ data: { slugs: deps.slugs } })
			: null,
	head: () => ({
		meta: [
			{ title: `${m.trip_title()} — ${SITE_NAME}` },
			{ name: "robots", content: "noindex" },
		],
	}),
	component: TripPage,
});

function TripPage() {
	const shared = Route.useLoaderData();
	const navigate = Route.useNavigate();
	return (
		<Container component="main" size="md" px={{ base: "sm", sm: "md" }} py="md">
			<PageHeader />
			{shared ? (
				<SharedTripView
					stops={shared}
					onUse={() => navigate({ search: {}, replace: true })}
				/>
			) : (
				<TripView />
			)}
		</Container>
	);
}
