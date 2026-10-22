/**
 * Reads altitudes from Terrarium tiles in the browser (canvas pixel reads).
 * Browser-only: imported by the elevation profile after mount.
 */
import { DEM_TILES } from "~/features/geosites/map-sources";
import { decodeTerrarium, tilePixel } from "./elevation";

type Tile = { z: number; x: number; y: number };

async function tilePixels({ z, x, y }: Tile, signal: AbortSignal) {
	const url = DEM_TILES.replace("{z}", String(z))
		.replace("{x}", String(x))
		.replace("{y}", String(y));
	const res = await fetch(url, { signal });
	if (!res.ok) throw new Error(`relief tile ${res.status}`);
	const bitmap = await createImageBitmap(await res.blob());
	const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
	const context = canvas.getContext("2d", { willReadFrequently: true });
	if (!context) throw new Error("no 2D canvas");
	context.drawImage(bitmap, 0, 0);
	return context.getImageData(0, 0, bitmap.width, bitmap.height).data;
}

/** Altitude in metres at each point, from tiles at `zoom`; each fetched once. */
export async function elevationsAt(
	points: readonly (readonly [number, number])[],
	zoom: number,
	signal: AbortSignal,
): Promise<number[]> {
	const located = points.map((p) => tilePixel(p, zoom));
	const tiles = new Map<string, Promise<Uint8ClampedArray>>();
	for (const { tile } of located) {
		const key = `${tile.x}/${tile.y}`;
		if (!tiles.has(key)) tiles.set(key, tilePixels(tile, signal));
	}
	return Promise.all(
		located.map(async ({ tile, px, py }) => {
			const data = await (tiles.get(
				`${tile.x}/${tile.y}`,
			) as Promise<Uint8ClampedArray>);
			const i = (py * 256 + px) * 4;
			return decodeTerrarium(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0);
		}),
	);
}
