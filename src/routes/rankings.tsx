import { Container } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { pageMetaTags } from "~/features/geoparks/seo";
import { PageHeader } from "~/features/i18n/components/PageHeader";
import { RankingsView } from "~/features/rankings/components/RankingsView";
import { getRankings } from "~/features/rankings/rankings.functions";
import {
	RANKINGS_PATH,
	RankingsSearchSchema,
} from "~/features/rankings/schemas";
import { pageCardPath } from "~/features/share/card-response";
import { alternateLinks } from "~/lib/i18n";
import { absoluteUrl, SITE_URL } from "~/lib/site";
import { m } from "~/paraglide/messages.js";

/** The top geosites by each GEOSSIT score; filters live in the URL. */
export const Route = createFileRoute("/rankings")({
	validateSearch: RankingsSearchSchema,
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) =>
		getRankings({
			data: { by: deps.by ?? "scientific", gp: deps.gp, uf: deps.uf },
		}),
	head: () => ({
		meta: pageMetaTags(
			m.rankings_title(),
			m.rankings_intro(),
			RANKINGS_PATH,
			absoluteUrl(pageCardPath("rankings")),
		),
		links: [
			{ rel: "canonical", href: absoluteUrl(RANKINGS_PATH) },
			...alternateLinks(RANKINGS_PATH, SITE_URL),
		],
	}),
	component: RankingsPage,
});

function RankingsPage() {
	const rankings = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	return (
		<Container component="main" size="md" px={{ base: "sm", sm: "md" }} py="md">
			<PageHeader />
			<RankingsView
				rankings={rankings}
				search={search}
				onSearchChange={(next) =>
					navigate({ search: next, replace: true, resetScroll: false })
				}
			/>
		</Container>
	);
}
