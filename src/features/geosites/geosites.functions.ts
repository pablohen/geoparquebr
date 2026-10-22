/**
 * Type-safe RPC boundary. Safe to import anywhere: on the client the build
 * replaces each handler with a fetch stub, so `geosites.server.ts` (and the
 * mongodb driver) never reach the browser bundle.
 */
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	findGeositeBySlug,
	findGeositesInBounds,
	findNearbyGeosites,
	findSimilarGeosites,
} from "./geosites.server";
import { probeImage } from "./photos.server";
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

/** Geosites in other states with the same themes and periods, for "Parecidos". */
export const getSimilarGeosites = createServerFn({ method: "GET" })
	.validator(z.object({ slug: z.string().min(1) }))
	.handler(async ({ data }) => {
		const similar = await findSimilarGeosites(data.slug);
		if (!similar) throw notFound();
		return similar;
	});

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
