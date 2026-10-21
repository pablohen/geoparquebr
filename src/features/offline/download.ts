/**
 * "Salvar para uso offline" for a geopark: asks the service worker to store
 * its pages, then fetches the data and tiles the app will ask for offline,
 * which the service worker caches on the way through. Browser-only.
 */

import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import {
	getGeositeFossils,
	getGeositeStrata,
} from "~/features/geology/geology.functions";
import type { GeoparkGeosite } from "~/features/geoparks/schemas";
import {
	getGeositeBySlug,
	getNearbyGeosites,
} from "~/features/geosites/geosites.functions";
import { DEM_TILES, STYLE_URL } from "~/features/geosites/map-sources";
import type { GeoparkId } from "~/features/geosites/schemas";
import type { BBox } from "~/lib/geo";
import { savedGeoparks } from "./store";
import { tileUrls } from "./tiles";

/** Map zooms covered: town level. Relief tiles are 256 px, one zoom deeper. */
const VECTOR_ZOOMS = [6, 12] as const;
const RELIEF_ZOOMS = [7, 12] as const;
const CONCURRENCY = 6;

export class OfflineUnavailableError extends Error {}

/** OpenFreeMap's current vector tile URL template, via its style and TileJSON. */
async function vectorTileTemplate(): Promise<string> {
	const style = (await (await fetch(STYLE_URL)).json()) as {
		sources: Record<string, { type: string; url?: string }>;
	};
	const source = Object.values(style.sources).find(
		(s) => s.type === "vector" && s.url,
	);
	if (!source?.url) throw new Error("no vector source in the map style");
	const tilejson = (await (await fetch(source.url)).json()) as {
		tiles: string[];
	};
	const template = tilejson.tiles[0];
	if (!template) throw new Error("no tiles in the TileJSON");
	return template;
}

/** Asks the service worker to store pages (and their assets); returns failures. */
function cachePages(worker: ServiceWorker, urls: string[]): Promise<number> {
	return new Promise((resolve) => {
		const channel = new MessageChannel();
		channel.port1.onmessage = (e) =>
			resolve(Number(e.data?.failed ?? urls.length));
		worker.postMessage({ type: "cache-pages", urls }, [channel.port2]);
	});
}

async function pool(tasks: (() => Promise<unknown>)[], onDone: () => void) {
	let failed = 0;
	let next = 0;
	await Promise.all(
		Array.from({ length: CONCURRENCY }, async () => {
			while (next < tasks.length) {
				const task = tasks[next++];
				try {
					await task?.();
				} catch {
					failed++;
				}
				onDone();
			}
		}),
	);
	return failed;
}

const fetchOk = async (url: string) => {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
};

export async function saveGeoparkOffline(
	{
		id,
		area,
		geosites,
		pageUrls,
	}: {
		id: GeoparkId;
		area: BBox;
		geosites: GeoparkGeosite[];
		/** Localized page URLs to store (geopark, geosites, map of the area…). */
		pageUrls: string[];
	},
	onProgress: (done: number, total: number) => void,
): Promise<{ failed: number }> {
	const worker = navigator.serviceWorker?.controller;
	if (!worker) throw new OfflineUnavailableError();

	const template = await vectorTileTemplate();
	const tiles = [
		...tileUrls(template, area, ...VECTOR_ZOOMS),
		...tileUrls(DEM_TILES, area, ...RELIEF_ZOOMS),
	];
	// The same requests the drawer and geosite pages make, so they match.
	const data = geosites.flatMap(({ slug }) => [
		() => getGeositeBySlug({ data: { slug } }),
		() => getGeositeFossils({ data: { slug } }),
		() => getGeositeStrata({ data: { slug } }),
		() => getNearbyGeosites({ data: { slug } }),
	]);

	// The map's code loads lazily, so a device that only browsed pages lacks
	// it; load it (and MapLibre's worker) now so the cache keeps both.
	const mapCode = [
		() => import("~/features/geosites/components/GeositeMap"),
		() => fetchOk(maplibreWorkerUrl),
	];
	const total = pageUrls.length + mapCode.length + data.length + tiles.length;
	let done = 0;
	const tick = (n = 1) => {
		done += n;
		onProgress(done, total);
	};
	onProgress(0, total);

	const pagesFailed = await cachePages(worker, pageUrls);
	tick(pageUrls.length);
	const failed =
		pagesFailed +
		(await pool(
			[...mapCode, ...data, ...tiles.map((url) => () => fetchOk(url))],
			() => tick(),
		));

	savedGeoparks.write({
		...savedGeoparks.read(),
		[id]: { savedAt: new Date().toISOString(), failed, geosites },
	});
	return { failed };
}
