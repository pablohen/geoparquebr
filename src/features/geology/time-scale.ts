/**
 * The geological time scale with ICS (International Commission on
 * Stratigraphy) chart colours, so a column reads like any geological map
 * legend, and the periods the age filter works with. Boundaries in Ma.
 */
/** Periods (eras before the Cambrian), youngest first; `maxMa` is the base. */
export const GEOLOGIC_PERIODS = [
	{ id: "quaternary", maxMa: 2.58, color: "#F9F97F" },
	{ id: "neogene", maxMa: 23.03, color: "#FFE619" },
	{ id: "paleogene", maxMa: 66, color: "#FD9A52" },
	{ id: "cretaceous", maxMa: 145, color: "#7FC64E" },
	{ id: "jurassic", maxMa: 201.4, color: "#34B2C9" },
	{ id: "triassic", maxMa: 251.9, color: "#812B92" },
	{ id: "permian", maxMa: 298.9, color: "#F04028" },
	{ id: "carboniferous", maxMa: 358.9, color: "#67A599" },
	{ id: "devonian", maxMa: 419.2, color: "#CB8C37" },
	{ id: "silurian", maxMa: 443.8, color: "#B3E1B6" },
	{ id: "ordovician", maxMa: 485.4, color: "#009270" },
	{ id: "cambrian", maxMa: 538.8, color: "#7FA056" },
	{ id: "neoproterozoic", maxMa: 1_000, color: "#FEB342" },
	{ id: "mesoproterozoic", maxMa: 1_600, color: "#FDB462" },
	{ id: "paleoproterozoic", maxMa: 2_500, color: "#F74370" },
	{ id: "archean", maxMa: 4_031, color: "#F0047F" },
] as const;

export type GeologicPeriodId = (typeof GEOLOGIC_PERIODS)[number]["id"];
export const GEOLOGIC_PERIOD_IDS = GEOLOGIC_PERIODS.map((p) => p.id) as [
	GeologicPeriodId,
	...GeologicPeriodId[],
];

/** A period's span in Ma: [top (younger), base (older)]. */
export function periodSpanMa(id: GeologicPeriodId): [number, number] {
	const i = GEOLOGIC_PERIODS.findIndex((p) => p.id === id);
	const top = i > 0 ? (GEOLOGIC_PERIODS[i - 1]?.maxMa ?? 0) : 0;
	return [top, GEOLOGIC_PERIODS[i]?.maxMa ?? 0];
}

/**
 * The Ma span covered by a range of periods, given in either order:
 * [young, old]. The oldest period has no lower limit (Hadean included).
 */
export function periodRangeMa([a, b]: [GeologicPeriodId, GeologicPeriodId]): [
	number,
	number,
] {
	const [aTop, aBase] = periodSpanMa(a);
	const [bTop, bBase] = periodSpanMa(b);
	const base = Math.max(aBase, bBase);
	const oldest = GEOLOGIC_PERIODS.at(-1)?.maxMa;
	return [
		Math.min(aTop, bTop),
		base === oldest ? Number.POSITIVE_INFINITY : base,
	];
}

/** The period an age (Ma) falls in, if any. */
export function periodForAge(ma: number): GeologicPeriodId | undefined {
	return GEOLOGIC_PERIODS.find((p) => ma <= p.maxMa)?.id;
}

const UNKNOWN = "#9e9e9e";

export function icsColorForAge(ma: number | undefined): string {
	if (ma === undefined) return UNKNOWN;
	return GEOLOGIC_PERIODS.find((p) => ma <= p.maxMa)?.color ?? UNKNOWN;
}

/** Midpoint of a unit's age range, falling back to whichever bound exists. */
export function midAge(minMa?: number, maxMa?: number): number | undefined {
	if (minMa !== undefined && maxMa !== undefined) return (minMa + maxMa) / 2;
	return minMa ?? maxMa;
}

/** Darkens a #rrggbb colour by `amount` (0–1), to separate same-period neighbours. */
export function shade(hex: string, amount: number): string {
	const n = Number.parseInt(hex.slice(1), 16);
	const f = 1 - amount;
	const ch = (shift: number) =>
		Math.round(((n >> shift) & 0xff) * f)
			.toString(16)
			.padStart(2, "0");
	return `#${ch(16)}${ch(8)}${ch(0)}`;
}

export function formatAgeRange(
	minMa?: number,
	maxMa?: number,
): string | undefined {
	if (minMa === undefined && maxMa === undefined) return undefined;
	if (minMa === undefined || maxMa === undefined || minMa === maxMa)
		return `${minMa ?? maxMa} Ma`;
	return `${minMa}–${maxMa} Ma`;
}
