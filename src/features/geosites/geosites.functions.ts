/**
 * Type-safe RPC boundary. Safe to import anywhere: on the client the build
 * replaces each handler with a fetch stub, so `geosites.server.ts` (and the
 * mongodb driver) never reach the browser bundle.
 */
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { cached } from "~/lib/cache.server";
import { photoStatus } from "~/lib/image";
import {
	findGeositeBySlug,
	findGeositesInBounds,
	findNearbyGeosites,
} from "./geosites.server";
import { GeositesInBoundsQuerySchema } from "./schemas";

export const getGeositesInBounds = createServerFn({ method: "GET" })
	.validator(GeositesInBoundsQuerySchema)
	.handler(({ data }) => findGeositesInBounds(data));

export const getGeositeBySlug = createServerFn({ method: "GET" })
	.validator(z.object({ slug: z.string().min(1) }))
	.handler(async ({ data }) => {
		const geosite = await findGeositeBySlug(data.slug);
		if (!geosite) throw notFound();
		return geosite;
	});

/** Geosites around one geosite, nearest first, for "Perto daqui". */
export const getNearbyGeosites = createServerFn({ method: "GET" })
	.validator(z.object({ slug: z.string().min(1) }))
	.handler(async ({ data }) => {
		const nearby = await findNearbyGeosites(data.slug);
		if (!nearby) throw notFound();
		return nearby;
	});

/**
 * Whether a GEOSSIT photo loads: "ok", "dead" (an HTTP error or not an
 * image; about 2% of links) or "unknown" (timeout, network). Only definite
 * answers are cached, so a slow moment doesn't hide a good photo for a week.
 */
async function probeImage(url: string): Promise<"ok" | "dead" | "unknown"> {
	try {
		return await cached(
			`image-ok:v2:${url}`,
			7 * 24 * 60 * 60 * 1_000,
			async () => {
				// Throws on timeout or network failure, which isn't cached.
				const res = await fetch(url, {
					method: "HEAD",
					signal: AbortSignal.timeout(5_000),
				});
				return photoStatus(res);
			},
		);
	} catch {
		return "unknown";
	}
}

/** Geosite page data: the record plus whether its photo loads. */
export const getGeositePage = createServerFn({ method: "GET" })
	.validator(z.object({ slug: z.string().min(1) }))
	.handler(async ({ data }) => {
		const geosite = await findGeositeBySlug(data.slug);
		if (!geosite) throw notFound();
		const photo = geosite.coverImageUrl
			? await probeImage(geosite.coverImageUrl)
			: "dead";
		return {
			geosite,
			// Share previews only use a photo known to load.
			shareImageOk: photo === "ok",
			// The page skips only a photo known to be dead.
			coverOk: photo !== "dead",
		};
	});
