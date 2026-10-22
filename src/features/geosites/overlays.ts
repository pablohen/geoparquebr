/**
 * Optional map overlays ("Camadas"): fossil record density (GBIF), contour
 * lines (from the relief tiles), geopark outlines (IBGE) and mineral
 * occurrences (SGB). Isomorphic ids and URLs; the MapLibre wiring lives in
 * overlay-layers.ts, which only the map imports.
 */
import { z } from "zod";

export const OVERLAY_IDS = [
	"fossils",
	"contours",
	"outlines",
	"minerals",
] as const;
export const OverlaySchema = z.enum(OVERLAY_IDS);
export type Overlay = z.infer<typeof OverlaySchema>;

/**
 * GBIF fossil specimens recorded in Brazil, as hexagon counts. Detail stops
 * at FOSSIL_MAXZOOM (the map stretches those tiles further in), so the layer
 * never resolves single specimens near protected geosites.
 */
export const FOSSIL_DENSITY_TILES =
	"https://api.gbif.org/v2/map/occurrence/density/{z}/{x}/{y}.mvt?srs=EPSG:3857&bin=hex&hexPerTile=30&basisOfRecord=FOSSIL_SPECIMEN&country=BR";
export const FOSSIL_MAXZOOM = 9;

/** SGB's mineral occurrences (mines, garimpos, …), drawn by SGB per tile. */
export const MINERALS_SERVICE =
	"https://geoportal.sgb.gov.br/server/rest/services/geologia/ocorrencias/MapServer";
export const MINERALS_EXPORT = `${MINERALS_SERVICE}/export?bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true&f=image`;
/** Through a protocol that retries SGB's intermittent failures (overlay-layers.ts). */
export const MINERALS_TILES = "sgb-minerals://{bbox-epsg-3857}";
/**
 * SGB fails a few tiles of each burst (500s, empty 200s): five tries, waiting
 * 0.8, 1.6, 2.4 and 3.2 s between them, about 8 s at most on a bad tile.
 */
export const MINERALS_RETRY = { tries: 5, backoffMs: 800 };
/** Below this the points merge into a solid carpet. */
export const MINERALS_MINZOOM = 6;

/** Contours appear from this zoom; spacing in metres per zoom: [minor, major]. */
export const CONTOURS_MINZOOM = 10;
export const CONTOUR_THRESHOLDS: Record<number, [number, number]> = {
	10: [100, 500],
	11: [50, 250],
	12: [50, 250],
	13: [20, 100],
	14: [10, 50],
};

/** Violet, light to dark, by log10 of the record count: one hue, distinct from the pins. */
export const DENSITY_STOPS: [number, string][] = [
	[0, "#efedf5"],
	[1, "#bcbddc"],
	[2, "#9e9ac8"],
	[3, "#756bb1"],
	[4, "#54278f"],
];
