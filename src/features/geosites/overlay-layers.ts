/**
 * MapLibre sources and layers for the overlays (overlays.ts). Browser-only:
 * imported by GeositeMap, which loads lazily.
 */

import mlcontour from "maplibre-contour";
import type { ExpressionSpecification, Map as MapLibreMap } from "maplibre-gl";
import { addProtocol } from "maplibre-gl";
import { GEOPARK_OUTLINES_URL } from "~/features/geoparks/outlines";
import { STATE_OUTLINES_URL, type Uf } from "~/features/states/states";
import { fetchTileWithRetry } from "~/lib/fetch-retry";
import { m } from "~/paraglide/messages.js";
import { DEM_TILES } from "./map-sources";
import {
	CONTOUR_THRESHOLDS,
	CONTOURS_MINZOOM,
	DENSITY_STOPS,
	FOSSIL_DENSITY_TILES,
	FOSSIL_MAXZOOM,
	MINERALS_EXPORT,
	MINERALS_MINZOOM,
	MINERALS_RETRY,
	MINERALS_TILES,
	type Overlay,
	PROTECTED_AREAS_URL,
	PROTECTED_INTEGRAL,
	PROTECTED_INTEGRAL_COLOR,
	PROTECTED_SUSTAINABLE_COLOR,
} from "./overlays";

/** Contours are computed in a worker from the same Terrarium tiles as the relief. */
const dem = new mlcontour.DemSource({
	url: DEM_TILES,
	encoding: "terrarium",
	maxzoom: 13,
	worker: true,
});
dem.setupMaplibre({ addProtocol } as Parameters<typeof dem.setupMaplibre>[0]);

/**
 * SGB's export endpoint fails some requests of a burst (500s, empty 200s);
 * retry them instead of leaving blank tiles.
 */
addProtocol("sgb-minerals", async ({ url }, abort) => {
	const bbox = url.slice("sgb-minerals://".length);
	return {
		data: await fetchTileWithRetry(
			`${MINERALS_EXPORT}&bbox=${bbox}`,
			abort.signal,
			MINERALS_RETRY,
		),
	};
});

/** Layer ids per overlay, for toggling. */
const LAYERS: Record<Overlay, string[]> = {
	fossils: ["overlay-fossils"],
	contours: ["overlay-contours", "overlay-contour-labels"],
	outlines: ["overlay-outlines-fill", "overlay-outlines"],
	minerals: ["overlay-minerals"],
	protected: ["overlay-protected-fill", "overlay-protected"],
};

const protectedColor: ExpressionSpecification = [
	"match",
	["get", "group"],
	PROTECTED_INTEGRAL,
	PROTECTED_INTEGRAL_COLOR,
	PROTECTED_SUSTAINABLE_COLOR,
];

const density: ExpressionSpecification = [
	"interpolate",
	["linear"],
	["log10", ["max", 1, ["get", "total"]]],
	...DENSITY_STOPS.flat(),
] as ExpressionSpecification;

/** Adds one overlay's source and layers, hidden, under `beforeId`. */
function add(map: MapLibreMap, overlay: Overlay, beforeId?: string) {
	switch (overlay) {
		case "fossils":
			map.addSource("overlay-fossils", {
				type: "vector",
				tiles: [FOSSIL_DENSITY_TILES],
				maxzoom: FOSSIL_MAXZOOM,
				attribution: m.overlay_fossils_attribution(),
			});
			map.addLayer(
				{
					id: "overlay-fossils",
					type: "fill",
					source: "overlay-fossils",
					"source-layer": "occurrence",
					paint: {
						"fill-color": density,
						"fill-opacity": 0.6,
						"fill-outline-color": "rgba(84, 39, 143, 0.35)",
					},
				},
				beforeId,
			);
			return;
		case "contours":
			map.addSource("overlay-contours", {
				type: "vector",
				tiles: [
					dem.contourProtocolUrl({
						thresholds: CONTOUR_THRESHOLDS,
						elevationKey: "ele",
						levelKey: "level",
						contourLayer: "contours",
					}),
				],
				minzoom: CONTOURS_MINZOOM,
				maxzoom: 15,
			});
			map.addLayer(
				{
					id: "overlay-contours",
					type: "line",
					source: "overlay-contours",
					"source-layer": "contours",
					paint: {
						"line-color": "rgba(122, 82, 40, 0.55)",
						// Major lines (level 1) heavier than minor ones.
						"line-width": ["match", ["get", "level"], 1, 1.2, 0.5],
					},
				},
				beforeId,
			);
			map.addLayer(
				{
					id: "overlay-contour-labels",
					type: "symbol",
					source: "overlay-contours",
					"source-layer": "contours",
					filter: [">", ["get", "level"], 0],
					layout: {
						"symbol-placement": "line",
						"text-field": [
							"concat",
							["number-format", ["get", "ele"], {}],
							" m",
						],
						"text-font": ["Noto Sans Regular"],
						"text-size": 10,
					},
					paint: {
						"text-color": "#7a5228",
						"text-halo-color": "rgba(255, 255, 255, 0.85)",
						"text-halo-width": 1.2,
					},
				},
				beforeId,
			);
			return;
		case "outlines":
			map.addSource("overlay-outlines", {
				type: "geojson",
				data: GEOPARK_OUTLINES_URL,
				attribution: m.overlay_outlines_attribution(),
			});
			map.addLayer(
				{
					id: "overlay-outlines-fill",
					type: "fill",
					source: "overlay-outlines",
					paint: { "fill-color": "#ea7a3a", "fill-opacity": 0.07 },
				},
				beforeId,
			);
			map.addLayer(
				{
					id: "overlay-outlines",
					type: "line",
					source: "overlay-outlines",
					paint: {
						"line-color": "#a24511",
						"line-width": 2,
						"line-dasharray": [3, 2],
					},
				},
				beforeId,
			);
			return;
		case "protected":
			map.addSource("overlay-protected", {
				type: "geojson",
				data: PROTECTED_AREAS_URL,
				attribution: m.overlay_protected_attribution(),
			});
			map.addLayer(
				{
					id: "overlay-protected-fill",
					type: "fill",
					source: "overlay-protected",
					paint: { "fill-color": protectedColor, "fill-opacity": 0.12 },
				},
				beforeId,
			);
			map.addLayer(
				{
					id: "overlay-protected",
					type: "line",
					source: "overlay-protected",
					paint: { "line-color": protectedColor, "line-width": 1.5 },
				},
				beforeId,
			);
			return;
		case "minerals":
			map.addSource("overlay-minerals", {
				type: "raster",
				tiles: [MINERALS_TILES],
				tileSize: 256,
				minzoom: MINERALS_MINZOOM,
				attribution: m.overlay_minerals_attribution(),
			});
			map.addLayer(
				{
					id: "overlay-minerals",
					type: "raster",
					source: "overlay-minerals",
					paint: { "raster-opacity": 0.9 },
				},
				beforeId,
			);
			return;
	}
}

const STATE_OUTLINE = "state-outline";

/**
 * Outlines the states the map is filtered to (`?uf=`); the file is fetched
 * the first time a state filter is on.
 */
export function applyStateOutline(
	map: MapLibreMap,
	states: readonly Uf[],
	beforeId?: string,
) {
	if (!map.getLayer(STATE_OUTLINE)) {
		if (states.length === 0) return;
		map.addSource(STATE_OUTLINE, {
			type: "geojson",
			data: STATE_OUTLINES_URL,
			attribution: m.state_outlines_attribution(),
		});
		map.addLayer(
			{
				id: STATE_OUTLINE,
				type: "line",
				source: STATE_OUTLINE,
				paint: { "line-color": "#a24511", "line-width": 2.5 },
			},
			beforeId,
		);
	}
	map.setFilter(STATE_OUTLINE, ["in", ["get", "uf"], ["literal", [...states]]]);
	map.setLayoutProperty(
		STATE_OUTLINE,
		"visibility",
		states.length > 0 ? "visible" : "none",
	);
}

/**
 * Shows the overlays in `on` and hides the rest. Sources are added the first
 * time an overlay is switched on, so nothing is fetched for unused ones.
 */
export function applyOverlays(
	map: MapLibreMap,
	on: readonly Overlay[],
	beforeId?: string,
) {
	for (const overlay of Object.keys(LAYERS) as Overlay[]) {
		const visible = on.includes(overlay);
		const [first] = LAYERS[overlay];
		if (!first) continue;
		if (!map.getLayer(first)) {
			if (!visible) continue;
			add(map, overlay, beforeId);
		}
		for (const id of LAYERS[overlay])
			map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
	}
}
