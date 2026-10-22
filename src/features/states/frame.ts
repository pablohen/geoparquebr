/** Map framing for a state page. Pure. */
import type { BBox } from "~/lib/geo";
import { roundBBox } from "~/lib/geo";

/**
 * A box around the points with a margin, so pins don't sit on the edge; a
 * single point (or a tight cluster) still gets a box of at least ~0.6°.
 */
export function frameAround(points: [number, number][]): BBox | null {
	if (points.length === 0) return null;
	const lngs = points.map((p) => p[0]);
	const lats = points.map((p) => p[1]);
	const pad = (lo: number, hi: number) => Math.max(0.3, (hi - lo) * 0.1);
	const [w, e] = [Math.min(...lngs), Math.max(...lngs)];
	const [s, n] = [Math.min(...lats), Math.max(...lats)];
	const px = pad(w, e);
	const py = pad(s, n);
	return roundBBox([
		Math.max(-180, w - px),
		Math.max(-90, s - py),
		Math.min(180, e + px),
		Math.min(90, n + py),
	]);
}
