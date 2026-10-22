/** Pin colours for the map, by period (ICS chart) or the one brand colour. */
import {
	GEOLOGIC_PERIODS,
	type GeologicPeriodId,
} from "~/features/geology/time-scale";

export const UNDATED_COLOR = "#9e9e9e";
/** Clusters mix ages, so in age mode they go neutral. */
export const MIXED_COLOR = "#5c5f66";

const BY_PERIOD = Object.fromEntries(
	GEOLOGIC_PERIODS.map((p) => [p.id, p.color]),
) as Record<GeologicPeriodId, string>;

export const periodPinColor = (period: GeologicPeriodId | undefined) =>
	period ? BY_PERIOD[period] : UNDATED_COLOR;
