/** Paths and the `<iframe>` snippet for the embeddable maps. Isomorphic. */
import type { GeoparkId } from "~/features/geosites/schemas";

export const geoparkEmbedPath = (id: GeoparkId) => `/embed/geoparks/${id}`;
export const geositeEmbedPath = (slug: string) => `/embed/geosites/${slug}`;

const escapeAttr = (s: string) =>
	s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** Code to paste into another site. */
export function iframeSnippet(
	src: string,
	title: string,
	height = 450,
): string {
	return `<iframe src="${escapeAttr(src)}" title="${escapeAttr(title)}" width="100%" height="${height}" style="border:0;border-radius:8px" loading="lazy" allowfullscreen></iframe>`;
}
