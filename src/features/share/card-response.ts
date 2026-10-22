/**
 * Paths and HTTP responses for share cards. Cards change only when GEOSSIT
 * data does, so the CDN keeps them for a week and serves stale ones while it
 * refreshes.
 */
import { z } from "zod";
import type { GeoparkId } from "~/features/geosites/schemas";

export const geositeCardPath = (slug: string) => `/og/geosites/${slug}`;
export const geoparkCardPath = (id: GeoparkId) => `/og/geoparks/${id}`;
export const stateCardPath = (uf: string) => `/og/states/${uf.toLowerCase()}`;
export const regionCardPath = (region: string) => `/og/regions/${region}`;
export const unitCardPath = (slug: string) => `/og/units/${slug}`;

/** Listing pages that share a card of their own. */
export const CARD_PAGES = [
	"rankings",
	"conservation",
	"stats",
	"timeline",
	"glossary",
	"states",
	"regions",
	"units",
	"compare",
] as const;
export const CardPageSchema = z.enum(CARD_PAGES);
export type CardPage = z.infer<typeof CardPageSchema>;
export const pageCardPath = (page: CardPage) => `/og/pages/${page}`;

export function cardResponse(png: Uint8Array<ArrayBuffer> | null): Response {
	if (!png) return new Response("Not found", { status: 404 });
	return new Response(png, {
		headers: {
			"Content-Type": "image/png",
			"Cache-Control":
				"public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
		},
	});
}
