/** Server-only reads for the data-quality page. */
import { geositesCollection } from "~/features/geosites/geosites.server";
import { probeImage } from "~/features/geosites/photos.server";
import { cached } from "~/lib/cache.server";
import { type PhotoStatus, type QualityInput, qualityReport } from "./quality";
import type { DataQuality } from "./schemas";

const DAY_MS = 24 * 60 * 60 * 1_000;
/** Photo links checked at once (GEOSSIT photos live on a few SGB hosts). */
const CONCURRENCY = 16;

async function probeAll(urls: string[]): Promise<Map<string, PhotoStatus>> {
	const out = new Map<string, PhotoStatus>();
	for (let i = 0; i < urls.length; i += CONCURRENCY) {
		const batch = urls.slice(i, i + CONCURRENCY);
		const statuses = await Promise.all(batch.map(probeImage));
		batch.forEach((url, j) => {
			out.set(url, statuses[j] ?? "unknown");
		});
	}
	return out;
}

/**
 * The report, rebuilt at most daily: it checks every photo link (each
 * cached for a week by `probeImage`). Names and places only, no coordinates.
 */
export function findDataQuality(): Promise<DataQuality> {
	return cached("data-quality:v1", DAY_MS, async () => {
		const docs = await (await geositesCollection())
			.find(
				{},
				{
					projection: {
						_id: 0,
						slug: 1,
						name: 1,
						municipality: 1,
						state: 1,
						summary: 1,
						categories: 1,
						scores: 1,
						coverImageUrl: 1,
						locationIssue: 1,
						"source.url": 1,
					},
				},
			)
			.toArray();
		const rows: QualityInput[] = docs.map(({ source, ...g }) => ({
			...g,
			sourceUrl: source?.url || undefined,
		}));
		const urls = [
			...new Set(
				rows.flatMap((g) => (g.coverImageUrl ? [g.coverImageUrl] : [])),
			),
		];
		return qualityReport(rows, await probeAll(urls), new Date());
	});
}
