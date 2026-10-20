import { createFileRoute } from "@tanstack/react-router";
import { GeositeExplorer } from "~/features/geosites/components/GeositeExplorer";
import { getGeositesInBounds } from "~/features/geosites/geosites.functions";
import { ExplorerSearchSchema } from "~/features/geosites/schemas";
import { SITE_URL } from "~/lib/site";

export const Route = createFileRoute("/")({
	validateSearch: ExplorerSearchSchema,
	// The map URL carries viewport state; canonicalise to the bare origin.
	head: () => ({
		meta: [
			{ property: "og:url", content: SITE_URL },
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
		],
		links: [{ rel: "canonical", href: `${SITE_URL}/` }],
	}),
	// Only the viewport and filters change the list; the drawer state
	// (site/tab/model) is fetched separately and must not re-run this.
	loaderDeps: ({ search: { bbox, cat, rel, gp } }) => ({ bbox, cat, rel, gp }),
	loader: ({ deps }) =>
		getGeositesInBounds({
			data: {
				bbox: deps.bbox,
				categories: deps.cat,
				relevance: deps.rel,
				geoparkId: deps.gp,
			},
		}),
	// Keep showing the current list while panning instead of a pending screen.
	pendingMs: Number.POSITIVE_INFINITY,
	component: ExplorerPage,
});

function ExplorerPage() {
	const geosites = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();

	return (
		<GeositeExplorer
			geosites={geosites}
			search={search}
			onSearchChange={(next, { replace = false } = {}) =>
				navigate({
					search: (prev) => ({ ...prev, ...next }),
					replace,
					resetScroll: false,
				})
			}
		/>
	);
}
