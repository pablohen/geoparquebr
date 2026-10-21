/** Web-mercator tile math for pre-caching an area. Pure. */
import type { BBox } from "~/lib/geo";

const tileX = (lng: number, z: number) =>
	Math.floor(((lng + 180) / 360) * 2 ** z);
const tileY = (lat: number, z: number) => {
	const r = (lat * Math.PI) / 180;
	return Math.floor(
		((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z,
	);
};

/** Every tile covering `bbox` at zooms `minZ`..`maxZ`, as `{z,x,y}` URLs. */
export function tileUrls(
	template: string,
	[w, s, e, n]: BBox,
	minZ: number,
	maxZ: number,
): string[] {
	const urls: string[] = [];
	for (let z = minZ; z <= maxZ; z++) {
		const max = 2 ** z - 1;
		const [x0, x1] = [tileX(w, z), Math.min(tileX(e, z), max)];
		// North is the smaller y.
		const [y0, y1] = [tileY(n, z), Math.min(tileY(s, z), max)];
		for (let x = x0; x <= x1; x++)
			for (let y = y0; y <= y1; y++)
				urls.push(
					template
						.replace("{z}", String(z))
						.replace("{x}", String(x))
						.replace("{y}", String(y)),
				);
	}
	return urls;
}
