import type { FeatureCollection, Point } from "geojson";
import {
	LngLatBounds,
	Map as MapLibreMap,
	NavigationControl,
	Popup,
	setWorkerUrl,
} from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { useEffect, useRef } from "react";
import { STYLE_URL } from "~/features/geosites/map-sources";
import { m } from "~/paraglide/messages.js";

// Same worker fix as GeositeMap: Vite rebundles MapLibre.
setWorkerUrl(workerUrl);

export type EmbedPoint = {
	slug: string;
	name: string;
	/** Public point: rounded for sensitive geosites. */
	point: [number, number];
	/** Absolute URL of the geosite page, opened in a new tab. */
	url: string;
};

const SOURCE = "embed-geosites";
const COLOR = "#ea7a3a";
/** Room for the title card (top left) and the attribution (bottom). */
const FIT_PADDING = { top: 96, bottom: 48, left: 40, right: 56 };

/**
 * The map inside `/embed/*`: points only, no app chrome. A click opens a small
 * popup linking to the geosite page in a new tab. Default export for
 * `React.lazy`, so MapLibre stays out of SSR.
 */
export default function EmbedMap({ points }: { points: EmbedPoint[] }) {
	const ref = useRef<HTMLDivElement>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: an embed's points never change.
	useEffect(() => {
		if (!ref.current) return;
		const bounds = new LngLatBounds();
		for (const p of points) bounds.extend(p.point);
		const map = new MapLibreMap({
			container: ref.current,
			style: STYLE_URL,
			attributionControl: { compact: true },
			...(points.length > 1
				? { bounds, fitBoundsOptions: { padding: FIT_PADDING, maxZoom: 12 } }
				: { center: points[0]?.point ?? [-51, -14], zoom: 11 }),
			// Scrolling the host page shouldn't zoom the map.
			cooperativeGestures: true,
			locale: {
				"NavigationControl.ZoomIn": m.map_zoom_in(),
				"NavigationControl.ZoomOut": m.map_zoom_out(),
				"NavigationControl.ResetBearing": m.map_reset_bearing(),
				"CooperativeGesturesHandler.WindowsHelpText": m.embed_gesture_windows(),
				"CooperativeGesturesHandler.MacHelpText": m.embed_gesture_mac(),
				"CooperativeGesturesHandler.MobileHelpText": m.embed_gesture_mobile(),
			},
		});
		map.addControl(new NavigationControl({ showCompass: false }), "top-right");

		map.on("load", () => {
			// A lazy iframe can lay out after the map was created; fit again at
			// the real size so no point is left outside.
			map.resize();
			if (points.length > 1)
				map.fitBounds(bounds, {
					padding: FIT_PADDING,
					maxZoom: 12,
					duration: 0,
				});
			const data: FeatureCollection<Point> = {
				type: "FeatureCollection",
				features: points.map((p) => ({
					type: "Feature",
					properties: { slug: p.slug },
					geometry: { type: "Point", coordinates: p.point },
				})),
			};
			map.addSource(SOURCE, { type: "geojson", data });
			map.addLayer({
				id: SOURCE,
				type: "circle",
				source: SOURCE,
				paint: {
					"circle-radius": 8,
					"circle-color": COLOR,
					"circle-stroke-width": 2,
					"circle-stroke-color": "#ffffff",
				},
			});
			map.on("click", SOURCE, (e) => {
				const slug = e.features?.[0]?.properties?.slug;
				const p = points.find((x) => x.slug === slug);
				if (!p) return;
				// Built with DOM nodes, not HTML strings, since names are data.
				const box = document.createElement("div");
				// The popup is always white; don't inherit the dark theme's text colour.
				box.style.color = "#1f1f22";
				const name = document.createElement("strong");
				name.textContent = p.name;
				const link = document.createElement("a");
				link.href = p.url;
				link.target = "_blank";
				link.rel = "noopener";
				link.textContent = m.embed_open_geosite();
				link.style.cssText = "display:block;margin-top:4px";
				box.append(name, link);
				new Popup({ offset: 10 })
					.setLngLat(p.point)
					.setDOMContent(box)
					.addTo(map);
			});
			map.on("mouseenter", SOURCE, () => {
				map.getCanvas().style.cursor = "pointer";
			});
			map.on("mouseleave", SOURCE, () => {
				map.getCanvas().style.cursor = "";
			});
		});
		return () => map.remove();
	}, []);

	return <div ref={ref} style={{ position: "absolute", inset: 0 }} />;
}
