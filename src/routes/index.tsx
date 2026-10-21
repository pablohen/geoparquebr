import { createFileRoute } from "@tanstack/react-router";
import maplibreCss from "maplibre-gl/dist/maplibre-gl.css?url";
import { GeositeExplorer } from "~/features/geosites/components/GeositeExplorer";
import { getGeositesInBounds } from "~/features/geosites/geosites.functions";
import { ExplorerSearchSchema } from "~/features/geosites/schemas";
import { savedGeoparks, savedGeositesInBounds } from "~/features/offline/store";
import { alternateLinks } from "~/lib/i18n";
import { absoluteUrl, SITE_URL } from "~/lib/site";

/**
 * Offline (installed app in the field), a viewport that was never loaded has
 * no cached response: list the geosites of geoparks saved for offline use,
 * else nothing, instead of the error screen. Online errors still surface.
 */
async function listGeositesOrEmptyOffline(
	...args: Parameters<typeof getGeositesInBounds>
) {
	try {
		return await getGeositesInBounds(...args);
	} catch (err) {
		// No connection, or one that drops requests (weak signal in the
		// field, where the phone still reports "online"): fetch rejects with
		// a TypeError. Geoparks saved for offline use still list their sites.
		const unreachable =
			err instanceof TypeError ||
			(typeof navigator !== "undefined" && !navigator.onLine);
		if (unreachable && typeof window !== "undefined")
			return savedGeositesInBounds(savedGeoparks.read(), args[0].data);
		throw err;
	}
}

export const Route = createFileRoute("/")({
	validateSearch: ExplorerSearchSchema,
	// The map URL carries viewport state; canonicalise to the bare home page.
	head: () => ({
		meta: [
			{ property: "og:url", content: absoluteUrl("/") },
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
		],
		links: [
			// Only the map page needs MapLibre's styles; other pages skip the request.
			{ rel: "stylesheet", href: maplibreCss },
			{ rel: "canonical", href: absoluteUrl("/") },
			...alternateLinks("/", SITE_URL),
		],
	}),
	// Only the viewport and filters change the list; the drawer state
	// (site/tab/model) is fetched separately and must not re-run this.
	loaderDeps: ({ search: { bbox, cat, rel, gp, age } }) => ({
		bbox,
		cat,
		rel,
		gp,
		age,
	}),
	loader: ({ deps }) =>
		listGeositesOrEmptyOffline({
			data: {
				bbox: deps.bbox,
				categories: deps.cat,
				relevance: deps.rel,
				geoparkId: deps.gp,
				age: deps.age,
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
