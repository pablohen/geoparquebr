import { Button } from "@mantine/core";
import { MagnifyingGlass } from "@phosphor-icons/react";
import type { FeatureCollection, Point } from "geojson";
import {
	type GeoJSONSource,
	Map as MapLibreMap,
	NavigationControl,
	ScaleControl,
	setWorkerUrl,
} from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { useEffect, useRef } from "react";
import type { GeositeWithDistance } from "../schemas";

// MapLibre resolves its worker relative to its own module URL, which breaks
// once Vite pre-bundles/rebundles it. Point it at the emitted asset instead.
setWorkerUrl(workerUrl);

type LngLat = { lng: number; lat: number };

type Props = {
	geosites: GeositeWithDistance[];
	center: LngLat;
	selectedSlug?: string;
	onSelect: (slug: string) => void;
	onSearchArea: (center: LngLat) => void;
};

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const SOURCE_ID = "geosites";
const LAYER_ID = "geosites-circles";

function toFeatureCollection(
	geosites: GeositeWithDistance[],
): FeatureCollection<Point> {
	return {
		type: "FeatureCollection",
		features: geosites.map((g) => ({
			type: "Feature",
			geometry: g.location,
			properties: { slug: g.slug, name: g.name },
		})),
	};
}

/**
 * Renders geosites as a single GeoJSON source + circle layer (GPU-side),
 * which scales to thousands of points, unlike one DOM marker per site.
 * Default export so it can be `React.lazy`-loaded client-side only.
 */
export default function GeositeMap({
	geosites,
	center,
	selectedSlug,
	onSelect,
	onSearchArea,
}: Props) {
	const containerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<MapLibreMap | null>(null);
	// Latest callbacks/data without re-creating the map.
	const latest = useRef({ geosites, selectedSlug, onSelect });
	latest.current = { geosites, selectedSlug, onSelect };

	// Create the map once.
	// biome-ignore lint/correctness/useExhaustiveDependencies: the map is created once; `center` changes are handled by flyTo below.
	useEffect(() => {
		if (!containerRef.current) return;
		const map = new MapLibreMap({
			container: containerRef.current,
			style: STYLE_URL,
			center: [center.lng, center.lat],
			zoom: 8,
			attributionControl: { compact: true },
		});
		map.addControl(
			new NavigationControl({ visualizePitch: true }),
			"top-right",
		);
		map.addControl(new ScaleControl({ unit: "metric" }), "bottom-left");

		map.on("load", () => {
			map.addSource(SOURCE_ID, {
				type: "geojson",
				data: toFeatureCollection(latest.current.geosites),
			});
			map.addLayer({
				id: LAYER_ID,
				type: "circle",
				source: SOURCE_ID,
				paint: {
					"circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 5, 12, 10],
					"circle-color": [
						"case",
						["==", ["get", "slug"], latest.current.selectedSlug ?? ""],
						"#a24511",
						"#ea7a3a",
					],
					"circle-stroke-width": 2,
					"circle-stroke-color": "#ffffff",
				},
			});
			map.on("click", LAYER_ID, (e) => {
				const slug = e.features?.[0]?.properties?.slug;
				if (typeof slug === "string") latest.current.onSelect(slug);
			});
			map.on("mouseenter", LAYER_ID, () => {
				map.getCanvas().style.cursor = "pointer";
			});
			map.on("mouseleave", LAYER_ID, () => {
				map.getCanvas().style.cursor = "";
			});
			// Deep link (?site=…): the selection effect ran before the layer existed.
			const { geosites, selectedSlug } = latest.current;
			const site = geosites.find((g) => g.slug === selectedSlug);
			if (site) map.jumpTo({ center: site.location.coordinates, zoom: 11 });
		});

		mapRef.current = map;
		return () => {
			map.remove();
			mapRef.current = null;
		};
	}, []);

	useEffect(() => {
		const source = mapRef.current?.getSource<GeoJSONSource>(SOURCE_ID);
		source?.setData(toFeatureCollection(geosites));
	}, [geosites]);

	useEffect(() => {
		const map = mapRef.current;
		if (!map?.getLayer(LAYER_ID)) return;
		map.setPaintProperty(LAYER_ID, "circle-color", [
			"case",
			["==", ["get", "slug"], selectedSlug ?? ""],
			"#a24511",
			"#ea7a3a",
		]);
		const site = geosites.find((g) => g.slug === selectedSlug);
		if (site)
			map.easeTo({
				center: site.location.coordinates,
				zoom: Math.max(map.getZoom(), 11),
			});
	}, [selectedSlug, geosites]);

	useEffect(() => {
		mapRef.current?.flyTo({ center: [center.lng, center.lat] });
	}, [center.lng, center.lat]);

	return (
		<>
			<div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
			<Button
				pos="absolute"
				top={12}
				left="50%"
				style={{ transform: "translateX(-50%)", zIndex: 1 }}
				size="xs"
				radius="xl"
				variant="white"
				color="dark"
				leftSection={<MagnifyingGlass size={14} />}
				onClick={() => {
					const c = mapRef.current?.getCenter();
					if (c) onSearchArea({ lng: round(c.lng), lat: round(c.lat) });
				}}
			>
				Buscar nesta área
			</Button>
		</>
	);
}

const round = (n: number) => Math.round(n * 10_000) / 10_000;
