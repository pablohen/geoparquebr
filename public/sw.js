/*
 * GeoparqueBR service worker: installable app + offline use in the field.
 *
 * - /assets/*      content-hashed build files → cache first (immutable)
 * - pages          network first, cached copy offline, else /offline.html
 * - /_serverFn/*   GET data (geosites, fossils, strata) → network first,
 *                  cached copy offline (e.g. geosites you opened before)
 * - map tiles      OpenFreeMap + SGB geology → stale-while-revalidate, capped
 *
 * Bump VERSION to drop every cache on the next visit.
 */
const VERSION = "v2";
const CACHES = {
	shell: `shell-${VERSION}`,
	assets: `assets-${VERSION}`,
	pages: `pages-${VERSION}`,
	data: `data-${VERSION}`,
	tiles: `tiles-${VERSION}`,
};
const LIMITS = { pages: 60, data: 300, tiles: 1500 };
const SHELL = [
	"/offline.html",
	"/favicon.svg",
	"/manifest.webmanifest",
	"/icons/icon-192.png",
];
const TILE_HOSTS = ["tiles.openfreemap.org", "geoportal.sgb.gov.br"];

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

	if (TILE_HOSTS.includes(url.hostname))
		event.respondWith(
			staleWhileRevalidate(request, CACHES.tiles, LIMITS.tiles),
		);
});

/**
 * Offline navigation fallback. Geosite pages only vary by ?tab/?model, which
 * the client applies itself, so any cached copy of the same path will do.
 * Map URLs carry the viewport and must match exactly (handled above).
 */
async function offlinePage(url) {
	if (url.pathname.startsWith("/geosites/")) {
		const cache = await caches.open(CACHES.pages);
		const copy = await cache.match(url.pathname, { ignoreSearch: true });
		if (copy) return copy;
	}
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
