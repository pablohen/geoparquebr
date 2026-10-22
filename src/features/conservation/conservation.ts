/** Pure ordering for the conservation page. */
import {
	type DegradationRisk,
	DegradationRiskSchema,
} from "~/features/geosites/schemas";
import type { AtRiskGeosite, Conservation } from "./schemas";

type Row = AtRiskGeosite & { degradationRisk?: DegradationRisk };

/** Counts per risk, and the high-risk geosites, most vulnerable first. */
export function conservation(rows: Row[]): Conservation {
	return {
		risks: DegradationRiskSchema.options.map((key) => ({
			key,
			count: rows.filter((r) => r.degradationRisk === key).length,
		})),
		high: rows
			.filter((r) => r.degradationRisk === "high")
			.map(({ degradationRisk: _, ...r }) => r)
			.sort(
				(a, b) =>
					(b.vulnerability ?? -1) - (a.vulnerability ?? -1) ||
					a.name.localeCompare(b.name, "pt"),
			),
		total: rows.length,
	};
}
