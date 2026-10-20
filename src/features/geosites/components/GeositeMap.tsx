import type { FeatureCollection, Point } from "geojson";
import {
	type ExpressionSpecification,
	type GeoJSONSource,
	type LngLatBounds,
	Map as MapLibreMap,
	NavigationControl,
	ScaleControl,
	setWorkerUrl,
} from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { useEffect, useRef } from "react";
import { type BBox, roundBBox } from "~/lib/geo";
import type { GeositeSummary } from "../schemas";

// MapLibre resolves its worker relative to its own module URL, which breaks
// once Vite pre-bundles/rebundles it. Point it at the emitted asset instead.
setWorkerUrl(workerUrl);

type Props = {
	geosites: GeositeSummary[];
	/** Viewport from the URL. The map fits to it unless the map itself produced it. */
	bbox: BBox;
	selectedSlug?: string;
	/** Location of the selected geosite (it may lie outside the loaded viewport). */
	focus?: [number, number];
	onSelect: (slug: string) => void;
	onViewportChange: (bbox: BBox) => void;
};

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const SOURCE_ID = "geosites";
const CLUSTERS = "geosites-clusters";
const CLUSTER_COUNT = "geosites-cluster-count";
const POINTS = "geosites-points";
const COLOR = "#ea7a3a";
const SELECTED_COLOR = "#a24511";

function toFeatureCollection(
	geosites: GeositeSummary[],
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

function toBBox(bounds: LngLatBounds): BBox {
	return roundBBox([
		Math.max(-180, bounds.getWest()),
		Math.max(-90, bounds.getSouth()),
		Math.min(180, bounds.getEast()),
		Math.min(90, bounds.getNorth()),
	]);
}

const pointColor = (selectedSlug?: string): ExpressionSpecification => [
	"case",
	["==", ["get", "slug"], selectedSlug ?? ""],
	SELECTED_COLOR,
	COLOR,
];

/**
 * Clustered geosite map. Owns the viewport: every move is reported via
 * `onViewportChange`, and the URL bbox only drives the map when it changes
 * from outside (location form, back/forward), which avoids fit→move loops.
 * Default export so it can be `React.lazy`-loaded client-side only.
 */
export default function GeositeMap({
	geosites,
	bbox,
	selectedSlug,
	focus,
	onSelect,
	onViewportChange,
}: Props) {
	const containerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<MapLibreMap | null>(null);
	const lastEmitted = useRef<string>("");
	// Latest props for map event handlers, without re-creating the map.
	const latest = useRef({ geosites, selectedSlug, onSelect, onViewportChange });
	latest.current = { geosites, selectedSlug, onSelect, onViewportChange };

	// biome-ignore lint/correctness/useExhaustiveDependencies: the map is created once; later bbox changes are handled below.
	useEffect(() => {
		if (!containerRef.current) return;
		const map = new MapLibreMap({
			container: containerRef.current,
			style: STYLE_URL,
			bounds: bbox,
			attributionControl: { compact: true },
		});
		map.addControl(
			new NavigationControl({ visualizePitch: true }),
			"top-right",
		);
		map.addControl(new ScaleControl({ unit: "metric" }), "bottom-left");

		const emitViewport = () => {
			const next = toBBox(map.getBounds());
			const key = JSON.stringify(next);
			if (key === lastEmitted.current) return;
			lastEmitted.current = key;
			latest.current.onViewportChange(next);
		};

		// `map.loaded()` is false whenever tiles are still streaming in (i.e. right
		// after most moves), so track "style + layers ready" ourselves.
		let ready = false;
		map.on("load", () => {
			ready = true;
			map.addSource(SOURCE_ID, {
				type: "geojson",
				data: toFeatureCollection(latest.current.geosites),
				cluster: true,
				clusterRadius: 40,
				clusterMaxZoom: 11,
			});
			map.addLayer({
				id: CLUSTERS,
				type: "circle",
				source: SOURCE_ID,
				filter: ["has", "point_count"],
				paint: {
					"circle-color": COLOR,
					"circle-opacity": 0.85,
					"circle-radius": ["step", ["get", "point_count"], 14, 10, 18, 50, 24],
					"circle-stroke-width": 2,
					"circle-stroke-color": "#ffffff",
				},
			});
			map.addLayer({
				id: CLUSTER_COUNT,
				type: "symbol",
				source: SOURCE_ID,
				filter: ["has", "point_count"],
				layout: {
					"text-field": ["get", "point_count_abbreviated"],
					"text-font": ["Noto Sans Bold"],
					"text-size": 12,
				},
				paint: { "text-color": "#ffffff" },
			});
			map.addLayer({
				id: POINTS,
				type: "circle",
				source: SOURCE_ID,
				filter: ["!", ["has", "point_count"]],
				paint: {
					"circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 5, 12, 9],
					"circle-color": pointColor(latest.current.selectedSlug),
					"circle-stroke-width": 2,
					"circle-stroke-color": "#ffffff",
				},
			});

			map.on("click", POINTS, (e) => {
				const slug = e.features?.[0]?.properties?.slug;
				if (typeof slug === "string") latest.current.onSelect(slug);
			});
			map.on("click", CLUSTERS, async (e) => {
				const feature = e.features?.[0];
				const clusterId = feature?.properties?.cluster_id;
				if (feature?.geometry.type !== "Point" || clusterId === undefined)
					return;
				const source = map.getSource<GeoJSONSource>(SOURCE_ID);
				const zoom = await source?.getClusterExpansionZoom(clusterId);
				map.easeTo({
					center: feature.geometry.coordinates as [number, number],
					zoom: zoom ?? map.getZoom() + 2,
				});
			});
			for (const layer of [POINTS, CLUSTERS]) {
				map.on("mouseenter", layer, () => {
					map.getCanvas().style.cursor = "pointer";
				});
				map.on("mouseleave", layer, () => {
					map.getCanvas().style.cursor = "";
				});
			}

			// The fitted view rarely matches the URL box exactly (aspect ratio);
			// report the real one so the list matches what's on screen.
			emitViewport();
		});
		map.on("moveend", () => {
			if (ready) emitViewport();
		});

		mapRef.current = map;
		return () => {
			map.remove();
			mapRef.current = null;
		};
	}, []);

	// External viewport changes (location form, history navigation).
	useEffect(() => {
		const map = mapRef.current;
		if (!map || JSON.stringify(bbox) === lastEmitted.current) return;
		map.fitBounds(bbox, { duration: 800 });
	}, [bbox]);

	useEffect(() => {
		const source = mapRef.current?.getSource<GeoJSONSource>(SOURCE_ID);
		source?.setData(toFeatureCollection(geosites));
	}, [geosites]);

	useEffect(() => {
		const map = mapRef.current;
		if (map?.getLayer(POINTS))
			map.setPaintProperty(POINTS, "circle-color", pointColor(selectedSlug));
	}, [selectedSlug]);

	// Bring the selected geosite into view, e.g. for a deep link outside the box.
	const focusKey = focus?.join(",");
	// biome-ignore lint/correctness/useExhaustiveDependencies: `focusKey` encodes `focus`.
	useEffect(() => {
		const map = mapRef.current;
		if (!map || !focus) return;
		const go = () =>
			map.easeTo({ center: focus, zoom: Math.max(map.getZoom(), 10) });
		if (map.getLayer(POINTS)) go();
		else map.once("load", go);
	}, [focusKey]);

	return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}
