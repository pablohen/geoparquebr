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
import { LatitudeSchema, LongitudeSchema } from "../geosites/schemas";
import { gbifFossilsNear } from "./gbif.server";
import {
	FOSSIL_SEARCH_RADIUS_KM,
	type FossilOccurrence,
	GEOLOGY_LAYER_SCALE,
	type GeologyAtPoint,
	type GeositeFossils,
	type GeositeStrata,
	STRATA_SEARCH_RADIUS_KM,
} from "./schemas";
import { type NearbyFossil, sgbFossilsNear, sgbStrataIn } from "./sgb.server";

const DAY_MS = 24 * 60 * 60 * 1_000;
const WEEK_MS = 7 * DAY_MS;
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
					cached(`fossils:sgb:v3:${data.slug}`, WEEK_MS, () =>
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

/** Geological maps change rarely; cache for a month. */
export const getGeositeStrata = createServerFn({ method: "GET" })
	.validator(SlugInput)
	.handler(async ({ data }): Promise<GeositeStrata> => {
		const { point } = await locate(data.slug);
		const radiusKm = STRATA_SEARCH_RADIUS_KM;
		try {
			const { scale, units } = await cached(
				`strata:v1:${data.slug}`,
				30 * DAY_MS,
				() => sgbStrataIn(bboxAround(point, radiusKm)),
			);
			return { status: "ok", scale, radiusKm, units };
		} catch (err) {
			console.warn("strata lookup failed:", err);
			return { status: "unavailable" };
		}
	});

/**
 * Units under a map click (public coordinates, unlike the slug lookups).
 * Rounded to ~100 m so nearby clicks share a cache entry.
 */
export const getGeologyAt = createServerFn({ method: "GET" })
	.validator(z.object({ lng: LongitudeSchema, lat: LatitudeSchema }))
	.handler(async ({ data }): Promise<GeologyAtPoint> => {
		const point: [number, number] = [
			Math.round(data.lng * 1_000) / 1_000,
			Math.round(data.lat * 1_000) / 1_000,
		];
		try {
			const { scale, units } = await cached(
				`geology-at:v1:${point.join(",")}`,
				30 * DAY_MS,
				() => sgbStrataIn(bboxAround(point, 0.05), [GEOLOGY_LAYER_SCALE]),
			);
			return { status: "ok", scale, units };
		} catch (err) {
			console.warn("geology lookup failed:", err);
			return { status: "unavailable" };
		}
	});
