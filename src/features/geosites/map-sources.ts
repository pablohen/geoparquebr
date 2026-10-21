/** Map tile sources, shared by the map and the offline download (no MapLibre import). */

/** OpenFreeMap's style; its vector tiles come from the TileJSON it points to. */
export const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

/**
 * Elevation: AWS Open Data "Terrain Tiles" (Terrarium-encoded, SRTM ~30 m
 * over Brazil), free and keyless.
 */
export const DEM_TILES =
	"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
