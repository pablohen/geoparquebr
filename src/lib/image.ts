/**
 * Whether an `<img>` has already failed. Server-rendered images start loading
 * before React hydrates, so an `onError` that fires first is never seen; on
 * mount, a finished image with no pixels is one that failed.
 */
export const imageFailed = (img: {
	complete: boolean;
	naturalWidth: number;
}): boolean => img.complete && img.naturalWidth === 0;

/** A photo URL's HEAD response: "ok" only for a successful image. */
export const photoStatus = (res: {
	ok: boolean;
	headers: { get: (name: string) => string | null };
}): "ok" | "dead" =>
	res.ok && (res.headers.get("content-type") ?? "").startsWith("image/")
		? "ok"
		: "dead";
