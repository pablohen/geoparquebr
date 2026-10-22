/** Checks GEOSSIT photo links, for geosite pages and the data-quality page. */
import { cached } from "~/lib/cache.server";
import { photoStatus } from "~/lib/image";

/**
 * Whether a GEOSSIT photo loads: "ok", "dead" (an HTTP error or not an
 * image; about 2% of links) or "unknown" (timeout, network). Only definite
 * answers are cached, so a slow moment doesn't hide a good photo for a week.
 */
export async function probeImage(
	url: string,
): Promise<"ok" | "dead" | "unknown"> {
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
