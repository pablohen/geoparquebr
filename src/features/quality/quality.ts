/** Pure: what each geosite lacks or gets wrong in GEOSSIT. */
import type { Geosite } from "~/features/geosites/schemas";
import {
	type DataQuality,
	ISSUE_KINDS,
	type IssueKind,
	type QualityRow,
} from "./schemas";

export type QualityInput = Pick<
	Geosite,
	| "slug"
	| "name"
	| "municipality"
	| "state"
	| "summary"
	| "categories"
	| "scores"
	| "coverImageUrl"
	| "locationIssue"
> & { sourceUrl?: string };

export type PhotoStatus = "ok" | "dead" | "unknown";

/** A geosite's issues, in `ISSUE_KINDS` order. */
export function issuesOf(
	g: QualityInput,
	photo: PhotoStatus | undefined,
): IssueKind[] {
	const found = new Set<IssueKind>();
	if (g.locationIssue) found.add(g.locationIssue);
	if (!g.coverImageUrl) found.add("photo-missing");
	else if (photo === "dead") found.add("photo-dead");
	if (!g.scores) found.add("no-scores");
	if (!g.summary.trim()) found.add("no-summary");
	if (g.categories.length === 0) found.add("no-theme");
	return ISSUE_KINDS.filter((k) => found.has(k));
}

/** The report: counts per issue and the geosites with any, by name. */
export function qualityReport(
	geosites: QualityInput[],
	photos: ReadonlyMap<string, PhotoStatus>,
	checkedAt: Date,
): DataQuality {
	const rows: QualityRow[] = [];
	let photosUnchecked = 0;
	for (const g of geosites) {
		const photo = g.coverImageUrl ? photos.get(g.coverImageUrl) : undefined;
		if (g.coverImageUrl && photo !== "ok" && photo !== "dead")
			photosUnchecked++;
		const issues = issuesOf(g, photo);
		if (issues.length > 0)
			rows.push({
				slug: g.slug,
				name: g.name,
				municipality: g.municipality,
				state: g.state,
				...(g.sourceUrl && { sourceUrl: g.sourceUrl }),
				issues,
			});
	}
	rows.sort((a, b) => a.name.localeCompare(b.name, "pt"));
	return {
		total: geosites.length,
		checkedAt: checkedAt.toISOString(),
		photosUnchecked,
		counts: Object.fromEntries(
			ISSUE_KINDS.map((k) => [
				k,
				rows.filter((r) => r.issues.includes(k)).length,
			]),
		) as DataQuality["counts"],
		rows,
	};
}
