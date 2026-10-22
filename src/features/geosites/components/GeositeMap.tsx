import type { FeatureCollection, Point } from "geojson";
import {
	addProtocol,
	type ExpressionSpecification,
	type GeoJSONSource,
	type LngLatBounds,
	Map as MapLibreMap,
	Marker,
	NavigationControl,
	ScaleControl,
	setWorkerUrl,
} from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { useEffect, useRef } from "react";
import { type TripPin, tripFeatures } from "~/features/trip/map";
import { type BBox, bboxCenter, flatBBox, roundBBox } from "~/lib/geo";
import { autoHideAttribution } from "~/lib/map-attribution";
import { m } from "~/paraglide/messages.js";
import { DEM_TILES, STYLE_URL } from "../map-sources";
import type { GeositeSummary } from "../schemas";

// MapLibre resolves its worker relative to its own module URL, which breaks
// once Vite pre-bundles/rebundles it. Point it at the emitted asset instead.
setWorkerUrl(workerUrl);

/**
 * SGB 1:1M lithostratigraphy, served as ArcGIS cached tiles whose level 0 is
 * web-mercator zoom 4. MapLibre can't offset `{z}` in a URL template, so a
 * custom protocol rewrites each request.
 */
const GEOLOGY_TILES =
	"https://geoportal.sgb.gov.br/server/rest/services/geologia/litoestratigrafia_1000000/MapServer/tile";
const SGB_ZOOM_OFFSET = 4;
// 1×1 transparent PNG for tiles outside the cache (404s).
const EMPTY_TILE = Uint8Array.from(
	atob(
		"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
	),
	(c) => c.charCodeAt(0),
).buffer;

addProtocol("sgb-geology", async ({ url }, abort) => {
	const [, z, x, y] = url.match(/^sgb-geology:\/\/(\d+)\/(\d+)\/(\d+)/) ?? [];
	const res = await fetch(
		`${GEOLOGY_TILES}/${Number(z) - SGB_ZOOM_OFFSET}/${y}/${x}`,
		{ signal: abort.signal },
	);
	if (res.status === 404) return { data: EMPTY_TILE };
	if (!res.ok) throw new Error(`SGB tile ${z}/${x}/${y}: HTTP ${res.status}`);
	return { data: await res.arrayBuffer() };
});

type Props = {
	geosites: GeositeSummary[];
	/** Viewport from the URL. The map fits to it unless the map itself produced it. */
	bbox: BBox;
	selectedSlug?: string;
	/** Location of the selected geosite (it may lie outside the loaded viewport). */
	focus?: [number, number];
	onSelect: (slug: string) => void;
	onViewportChange: (bbox: BBox) => void;
	/** SGB geology raster layer. */
	geology: { visible: boolean; opacity: number };
	/** Click on empty map (not a geosite) while the geology layer is on. */
	onIdentify: (point: [number, number]) => void;
	/** Marker for the point being identified. */
	identifyPoint?: [number, number];
	/** "Relevo 3D": terrain elevation plus a tilted camera. */
	terrain: boolean;
	/** The trip drawn as a numbered route; undefined hides it. */
	trip?: TripPin[];
	/** "Perto de mim": where the traveller is, shown as a dot. */
	userPoint?: [number, number];
};

const SOURCE_ID = "geosites";
const CLUSTERS = "geosites-clusters";
const CLUSTER_COUNT = "geosites-cluster-count";
const POINTS = "geosites-points";
const GEOLOGY = "sgb-geology";
const TRIP = "trip";
const TRIP_LINE = "trip-line";
const TRIP_STOPS = "trip-stops";
const TRIP_NUMBERS = "trip-numbers";
const TRIP_COLOR = "#1c7ed6";

/**
 * Elevation (DEM_TILES) feeds two sources, as MapLibre recommends: one for
 * the hillshade drawn by default, one for the opt-in 3D terrain.
 */
const DEM_HILLSHADE = "dem-hillshade";
const DEM_TERRAIN = "dem-terrain";
const HILLSHADE = "relief-hillshade";
const TERRAIN_EXAGGERATION = 1.5;
const TERRAIN_PITCH = 60;
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
	geology,
	onIdentify,
	identifyPoint,
	terrain,
	trip,
	userPoint,
}: Props) {
	const containerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<MapLibreMap | null>(null);
	const lastEmitted = useRef<string>("");
	// Latest props for map event handlers, without re-creating the map.
	const latest = useRef({
		geosites,
		selectedSlug,
		onSelect,
		onViewportChange,
		geology,
		onIdentify,
		terrain,
		trip,
	});
	latest.current = {
		geosites,
		selectedSlug,
		onSelect,
		onViewportChange,
		geology,
		onIdentify,
		terrain,
		trip,
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: the map is created once; later bbox changes are handled below.
	useEffect(() => {
		if (!containerRef.current) return;
		const map = new MapLibreMap({
			container: containerRef.current,
			style: STYLE_URL,
			bounds: bbox,
			attributionControl: { compact: true },
			locale: {
				"NavigationControl.ZoomIn": m.map_zoom_in(),
				"NavigationControl.ZoomOut": m.map_zoom_out(),
				"NavigationControl.ResetBearing": m.map_reset_bearing(),
				"GeolocateControl.FindMyLocation": m.map_find_my_location(),
				"GeolocateControl.LocationNotAvailable": m.map_location_not_available(),
			},
		});
		map.addControl(
			new NavigationControl({ visualizePitch: true }),
			"top-right",
		);
		map.addControl(new ScaleControl({ unit: "metric" }), "bottom-left");

		const emitViewport = () => {
			// A tilted map's bounds reach the horizon; report the flat view's.
			const next =
				map.getPitch() > 1
					? roundBBox(
							flatBBox(
								map.getCenter().toArray() as [number, number],
								map.getZoom(),
								map.getContainer().clientWidth,
								map.getContainer().clientHeight,
							),
						)
					: toBBox(map.getBounds());
			const key = JSON.stringify(next);
			if (key === lastEmitted.current) return;
			lastEmitted.current = key;
			latest.current.onViewportChange(next);
		};

		// `map.loaded()` is false whenever tiles are still streaming in (i.e. right
		// after most moves), so track "style + layers ready" ourselves.
		let ready = false;
		// Credits show at first, then fold to their "i" button.
		let cancelAutoHide = () => {};
		map.on("load", () => {
			ready = true;
			cancelAutoHide = autoHideAttribution(map.getContainer());
			// Geology goes under the basemap's labels; geosites go on top of all.
			const firstLabel = map
				.getStyle()
				.layers.find((layer) => layer.type === "symbol")?.id;
			map.addSource(GEOLOGY, {
				type: "raster",
				tiles: ["sgb-geology://{z}/{x}/{y}"],
				tileSize: 256,
				minzoom: SGB_ZOOM_OFFSET,
				maxzoom: SGB_ZOOM_OFFSET + 9,
				attribution: m.map_geology_attribution(),
			});
			map.addLayer(
				{
					id: GEOLOGY,
					type: "raster",
					source: GEOLOGY,
					layout: {
						visibility: latest.current.geology.visible ? "visible" : "none",
					},
					paint: { "raster-opacity": latest.current.geology.opacity },
				},
				firstLabel,
			);
			// Relief shading over the basemap and geology, under the labels.
			for (const id of [DEM_HILLSHADE, DEM_TERRAIN])
				map.addSource(id, {
					type: "raster-dem",
					tiles: [DEM_TILES],
					tileSize: 256,
					maxzoom: 15,
					encoding: "terrarium",
					attribution: id === DEM_HILLSHADE ? m.map_relief_attribution() : "",
				});
			map.addLayer(
				{
					id: HILLSHADE,
					type: "hillshade",
					source: DEM_HILLSHADE,
					paint: {
						"hillshade-exaggeration": 0.3,
						"hillshade-shadow-color": "#3d3528",
					},
				},
				firstLabel,
			);
			if (latest.current.terrain) applyTerrain(map, true, { animate: false });
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

			// The trip, above the geosites: a dashed route and numbered stops.
			map.addSource(TRIP, {
				type: "geojson",
				data: tripFeatures(latest.current.trip ?? []),
			});
			const tripVisibility = latest.current.trip ? "visible" : "none";
			map.addLayer({
				id: TRIP_LINE,
				type: "line",
				source: TRIP,
				filter: ["==", ["get", "kind"], "route"],
				layout: { visibility: tripVisibility, "line-cap": "round" },
				paint: {
					"line-color": TRIP_COLOR,
					"line-width": 3,
					"line-dasharray": [2, 1.5],
				},
			});
			map.addLayer({
				id: TRIP_STOPS,
				type: "circle",
				source: TRIP,
				filter: ["==", ["get", "kind"], "stop"],
				layout: { visibility: tripVisibility },
				paint: {
					"circle-radius": 11,
					"circle-color": TRIP_COLOR,
					"circle-stroke-width": 2,
					"circle-stroke-color": "#ffffff",
				},
			});
			map.addLayer({
				id: TRIP_NUMBERS,
				type: "symbol",
				source: TRIP,
				filter: ["==", ["get", "kind"], "stop"],
				layout: {
					visibility: tripVisibility,
					"text-field": ["to-string", ["get", "n"]],
					"text-font": ["Noto Sans Bold"],
					"text-size": 12,
					"text-allow-overlap": true,
				},
				paint: { "text-color": "#ffffff" },
			});

			map.on("click", POINTS, (e) => {
				const slug = e.features?.[0]?.properties?.slug;
				if (typeof slug === "string") latest.current.onSelect(slug);
			});
			map.on("click", TRIP_STOPS, (e) => {
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
			map.on("click", (e) => {
				if (!latest.current.geology.visible) return;
				const hit = map.queryRenderedFeatures(e.point, {
					layers: [POINTS, CLUSTERS, TRIP_STOPS],
				});
				if (hit.length === 0)
					latest.current.onIdentify([e.lngLat.lng, e.lngLat.lat]);
			});
			for (const layer of [POINTS, CLUSTERS, TRIP_STOPS]) {
				map.on("mouseenter", layer, () => {
					map.getCanvas().style.cursor = "pointer";
				});
				map.on("mouseleave", layer, () => {
					map.getCanvas().style.cursor = latest.current.geology.visible
						? "crosshair"
						: "";
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
			cancelAutoHide();
			map.remove();
			mapRef.current = null;
		};
	}, []);

	// External viewport changes (location form, history navigation).
	useEffect(() => {
		const map = mapRef.current;
		if (!map || JSON.stringify(bbox) === lastEmitted.current) return;
		if (map.getPitch() > 1) {
			// Keep the tilt: frame the box as a flat map would, then ease there.
			const camera = map.cameraForBounds(bbox, { bearing: 0 });
			map.easeTo({
				center: bboxCenter(bbox),
				zoom: camera?.zoom ?? map.getZoom(),
				duration: 800,
			});
		} else map.fitBounds(bbox, { duration: 800 });
	}, [bbox]);

	useEffect(() => {
		const map = mapRef.current;
		if (map?.getSource(DEM_TERRAIN)) applyTerrain(map, terrain);
	}, [terrain]);

	useEffect(() => {
		const source = mapRef.current?.getSource<GeoJSONSource>(SOURCE_ID);
		source?.setData(toFeatureCollection(geosites));
	}, [geosites]);

	useEffect(() => {
		const map = mapRef.current;
		if (map?.getLayer(POINTS))
			map.setPaintProperty(POINTS, "circle-color", pointColor(selectedSlug));
	}, [selectedSlug]);

	useEffect(() => {
		const map = mapRef.current;
		if (!map?.getLayer(GEOLOGY)) return;
		map.setLayoutProperty(
			GEOLOGY,
			"visibility",
			geology.visible ? "visible" : "none",
		);
		map.setPaintProperty(GEOLOGY, "raster-opacity", geology.opacity);
		map.getCanvas().style.cursor = geology.visible ? "crosshair" : "";
	}, [geology.visible, geology.opacity]);

	const tripKey = trip ? JSON.stringify(trip) : "";
	// biome-ignore lint/correctness/useExhaustiveDependencies: `tripKey` encodes `trip`.
	useEffect(() => {
		const map = mapRef.current;
		if (!map?.getLayer(TRIP_STOPS)) return;
		map.getSource<GeoJSONSource>(TRIP)?.setData(tripFeatures(trip ?? []));
		for (const id of [TRIP_LINE, TRIP_STOPS, TRIP_NUMBERS])
			map.setLayoutProperty(id, "visibility", trip ? "visible" : "none");
	}, [tripKey]);

	const userKey = userPoint?.join(",");
	// biome-ignore lint/correctness/useExhaustiveDependencies: `userKey` encodes `userPoint`.
	useEffect(() => {
		const map = mapRef.current;
		if (!map || !userPoint) return;
		const dot = document.createElement("div");
		dot.style.cssText =
			"width:16px;height:16px;border-radius:50%;background:#1c7ed6;border:3px solid #fff;box-shadow:0 0 0 6px rgba(28,126,214,.25)";
		const marker = new Marker({ element: dot }).setLngLat(userPoint).addTo(map);
		return () => {
			marker.remove();
		};
	}, [userKey]);

	const identifyKey = identifyPoint?.join(",");
	// biome-ignore lint/correctness/useExhaustiveDependencies: `identifyKey` encodes `identifyPoint`.
	useEffect(() => {
		const map = mapRef.current;
		if (!map || !identifyPoint) return;
		const marker = new Marker({ color: "#1f1f22" })
			.setLngLat(identifyPoint)
			.addTo(map);
		return () => {
			marker.remove();
		};
	}, [identifyKey]);

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

/** Turns 3D terrain on (tilting a flat view) or off (back to a flat map). */
function applyTerrain(
	map: MapLibreMap,
	on: boolean,
	{ animate = true }: { animate?: boolean } = {},
) {
	map.setTerrain(
		on ? { source: DEM_TERRAIN, exaggeration: TERRAIN_EXAGGERATION } : null,
	);
	const pitch = on ? Math.max(map.getPitch(), TERRAIN_PITCH) : 0;
	if (animate) map.easeTo({ pitch, duration: 700 });
	else map.jumpTo({ pitch });
}
