import { createFileRoute } from "@tanstack/react-router";
import { GeositeExplorer } from "~/features/geosites/components/GeositeExplorer";
import { getNearbyGeosites } from "~/features/geosites/geosites.functions";
import { ExplorerSearchSchema } from "~/features/geosites/schemas";

export const Route = createFileRoute("/")({
	validateSearch: ExplorerSearchSchema,
	// `site` only toggles the drawer, so it is deliberately not a loader dep.
	loaderDeps: ({ search: { lng, lat, radiusKm } }) => ({ lng, lat, radiusKm }),
	loader: ({ deps }) => getNearbyGeosites({ data: deps }),
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
			onSearchChange={(next) =>
				navigate({ search: (prev) => ({ ...prev, ...next }) })
			}
		/>
	);
}
