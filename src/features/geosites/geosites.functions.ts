/**
 * Type-safe RPC boundary. Safe to import anywhere: on the client the build
 * replaces each handler with a fetch stub, so `geosites.server.ts` (and the
 * mongodb driver) never reach the browser bundle.
 */
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { cached } from "~/lib/cache.server";
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

/** ~2% of GEOSSIT photo links 404; never put a dead image in a share preview. */
async function imageIsReachable(url: string): Promise<boolean> {
	return cached(`image-ok:v1:${url}`, 7 * 24 * 60 * 60 * 1_000, async () => {
		try {
			const res = await fetch(url, {
				method: "HEAD",
				signal: AbortSignal.timeout(5_000),
			});
			return (
				res.ok && (res.headers.get("content-type") ?? "").startsWith("image/")
			);
		} catch {
			return false;
		}
	}).catch(() => false);
}

/** Geosite page data: the record plus whether its photo can be shared. */
export const getGeositePage = createServerFn({ method: "GET" })
	.validator(z.object({ slug: z.string().min(1) }))
	.handler(async ({ data }) => {
		const geosite = await findGeositeBySlug(data.slug);
		if (!geosite) throw notFound();
		const shareImageOk = geosite.coverImageUrl
			? await imageIsReachable(geosite.coverImageUrl)
			: false;
		return { geosite, shareImageOk };
	});
