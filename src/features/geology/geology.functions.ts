/**
 * Per-geosite geology lookups. Clients pass a slug, never coordinates: the
 * server resolves exact coordinates itself, so sensitive locations stay private.
 */
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { cached } from "~/lib/cache.server";
import { bboxAround } from "~/lib/geo";
import { findGeositeLocation } from "../geosites/geosites.server";
import { gbifFossilsNear } from "./gbif.server";
import {
	FOSSIL_SEARCH_RADIUS_KM,
	type FossilOccurrence,
	type GeositeFossils,
} from "./schemas";
import { type NearbyFossil, sgbFossilsNear } from "./sgb.server";

const WEEK_MS = 7 * 24 * 60 * 60 * 1_000;
const SlugInput = z.object({ slug: z.string().min(1) });

async function locate(slug: string) {
	const location = await findGeositeLocation(slug);
	if (!location) throw notFound();
	return location;
}

/** Runs one upstream lookup; an outage becomes "unavailable" instead of failing the request. */
async function settle(
	lookup: () => Promise<{ items: NearbyFossil[]; total: number }>,
	sensitive: boolean,
): Promise<GeositeFossils["sgb"]> {
	try {
		const { items, total } = await lookup();
		const toKm = (m: number) =>
			sensitive ? Math.round(m / 1_000) : Math.round(m / 100) / 10;
		return {
			status: "ok",
			total,
			items: items
				.sort((a, b) => a.distanceM - b.distanceM)
				.map(
					({ distanceM, ...rest }): FossilOccurrence => ({
						...rest,
						distanceKm: toKm(distanceM),
					}),
				),
		};
	} catch (err) {
		console.warn("fossil lookup failed:", err);
		return { status: "unavailable" };
	}
}

export const getGeositeFossils = createServerFn({ method: "GET" })
	.validator(SlugInput)
	.handler(async ({ data }): Promise<GeositeFossils> => {
		const { point, sensitive } = await locate(data.slug);
		const radiusKm = FOSSIL_SEARCH_RADIUS_KM;

		const [sgb, gbif] = await Promise.all([
			settle(
				() =>
					cached(`fossils:sgb:v2:${data.slug}`, WEEK_MS, () =>
						sgbFossilsNear(point, bboxAround(point, radiusKm), radiusKm),
					),
				sensitive,
			),
			settle(
				() =>
					cached(`fossils:gbif:v1:${data.slug}`, WEEK_MS, () =>
						gbifFossilsNear(point, radiusKm),
					),
				sensitive,
			),
		]);
		return { radiusKm, sgb, gbif };
	});
