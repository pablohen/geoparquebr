/**
 * Paths and HTTP responses for share cards. Cards change only when GEOSSIT
 * data does, so the CDN keeps them for a week and serves stale ones while it
 * refreshes.
 */
import type { GeoparkId } from "~/features/geosites/schemas";

export const geositeCardPath = (slug: string) => `/og/geosites/${slug}`;
export const geoparkCardPath = (id: GeoparkId) => `/og/geoparks/${id}`;

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
