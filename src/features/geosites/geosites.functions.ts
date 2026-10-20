/**
 * Type-safe RPC boundary. Safe to import anywhere: on the client the build
 * replaces each handler with a fetch stub, so `geosites.server.ts` (and the
 * mongodb driver) never reach the browser bundle.
 */
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { findGeositeBySlug, findGeositesInBounds } from "./geosites.server";
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
