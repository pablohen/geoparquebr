/*
 * GeoparqueBR service worker: installable app + offline use in the field.
 *
 * - /assets/*      content-hashed build files → cache first (immutable)
 * - pages          network first, cached copy offline, else /offline.html
 * - /_serverFn/*   GET data (geosites, fossils, strata) → network first,
 *                  cached copy offline (e.g. geosites you opened before)
 * - map tiles      OpenFreeMap + SGB geology → stale-while-revalidate, capped
 * - relief tiles   AWS Terrain Tiles (hillshade, 3D) → same, own cache
 *
 * Pages can ask for a list of URLs to be cached ahead of time ("Salvar para
 * uso offline" on a geopark page): postMessage({ type: "cache-pages", urls })
 * with a MessageChannel port; the reply is { failed }.
 *
 * Bump VERSION to drop every cache on the next visit.
 */
const VERSION = "v7";
const CACHES = {
	shell: `shell-${VERSION}`,
	assets: `assets-${VERSION}`,
	pages: `pages-${VERSION}`,
	data: `data-${VERSION}`,
	tiles: `tiles-${VERSION}`,
	relief: `relief-${VERSION}`,
};
// Room for a few saved geoparks (~200 map + ~200 relief tiles, ~25 pages
// each) on top of normal browsing. Relief tiles are 40–100 KB each.
const LIMITS = { pages: 150, data: 600, tiles: 4000, relief: 2000 };
const SHELL = [
	"/offline.html",
	"/favicon.svg",
	"/manifest.webmanifest",
	"/icons/icon-192.png",
];
const TILE_HOSTS = ["tiles.openfreemap.org", "geoportal.sgb.gov.br"];
const RELIEF_PREFIX =
	"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/";

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHES.shell).then((cache) => cache.addAll(SHELL)),
	);
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	const current = new Set(Object.values(CACHES));
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys.filter((k) => !current.has(k)).map((k) => caches.delete(k)),
				),
			)
			.then(() => self.clients.claim()),
	);
});

self.addEventListener("fetch", (event) => {
	const { request } = event;
	if (request.method !== "GET") return;
	const url = new URL(request.url);

	if (url.origin === self.location.origin) {
		if (url.pathname.startsWith("/assets/"))
			return event.respondWith(cacheFirst(request, CACHES.assets));
		if (url.pathname.startsWith("/_serverFn/"))
			return event.respondWith(networkFirst(request, CACHES.data, LIMITS.data));
		if (request.mode === "navigate")
			return event.respondWith(
				networkFirst(request, CACHES.pages, LIMITS.pages).catch(() =>
					offlinePage(url),
				),
			);
		if (SHELL.includes(url.pathname))
			return event.respondWith(cacheFirst(request, CACHES.shell));
		return;
	}

	if (request.url.startsWith(RELIEF_PREFIX))
		return event.respondWith(
			staleWhileRevalidate(request, CACHES.relief, LIMITS.relief),
		);
	if (TILE_HOSTS.includes(url.hostname))
		event.respondWith(
			staleWhileRevalidate(request, CACHES.tiles, LIMITS.tiles),
		);
});

self.addEventListener("message", (event) => {
	if (event.data?.type !== "cache-pages") return;
	const port = event.ports[0];
	event.waitUntil(
		cachePages(event.data.urls ?? []).then((failed) =>
			port?.postMessage({ failed }),
		),
	);
});

/**
 * Stores same-origin pages plus the hashed scripts and styles they load, so
 * they open offline even if this device never visited them. Returns how
 * many pages failed.
 */
async function cachePages(urls) {
	const pages = await caches.open(CACHES.pages);
	let failed = 0;
	for (const url of urls) {
		try {
			const res = await fetch(url, { credentials: "same-origin" });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const html = await res.clone().text();
			await pages.put(url, res);
			const assets = new Set(html.match(/\/assets\/[\w.-]+/g) ?? []);
			await Promise.all(
				[...assets].map((a) =>
					cacheFirst(new Request(a), CACHES.assets).catch(() => {}),
				),
			);
		} catch {
			failed++;
		}
	}
	trim(pages, LIMITS.pages);
	return failed;
}

/**
 * Offline navigation fallback. Geosite, geopark and "my" pages only vary by
 * search params the client applies itself (?tab, ?model), so any cached
 * copy of the same path will do.
 * Map URLs carry the viewport and must match exactly (handled above).
 */
async function offlinePage(url) {
	if (
		/^(\/(en|es))?\/(geosites|geoparks|fossils|my-geosites|trip)(\/|$)/.test(
			url.pathname,
		)
	) {
		const cache = await caches.open(CACHES.pages);
		const copy = await cache.match(url.pathname, { ignoreSearch: true });
		if (copy) return copy;
	}
	// The offline page picks its language from the URL it stands in for.
	return caches.match("/offline.html");
}

async function cacheFirst(request, cacheName) {
	const cached = await caches.match(request);
	if (cached) return cached;
	const response = await fetch(request);
	if (response.ok)
		(await caches.open(cacheName)).put(request, response.clone());
	return response;
}

async function networkFirst(request, cacheName, limit) {
	const cache = await caches.open(cacheName);
	try {
		const response = await fetch(request);
		if (response.ok) {
			await cache.put(request, response.clone());
			trim(cache, limit);
		}
		return response;
	} catch (error) {
		const cached = await cache.match(request);
		if (cached) return cached;
		throw error;
	}
}

async function staleWhileRevalidate(request, cacheName, limit) {
	const cache = await caches.open(cacheName);
	const cached = await cache.match(request);
	const network = fetch(request)
		.then((response) => {
			if (response.ok) {
				cache.put(request, response.clone());
				trim(cache, limit);
			}
			return response;
		})
		.catch(() => cached);
	return cached ?? network;
}

/** Drops the oldest entries (insertion order) beyond `limit`. */
async function trim(cache, limit) {
	const keys = await cache.keys();
	await Promise.all(
		keys.slice(0, Math.max(0, keys.length - limit)).map((k) => cache.delete(k)),
	);
}
