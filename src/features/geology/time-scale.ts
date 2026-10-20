/**
 * ICS (International Commission on Stratigraphy) chart colours by age, so a
 * column reads like any geological map legend. Boundaries in Ma.
 */
const ICS_PERIODS: [maxMa: number, name: string, color: string][] = [
	[2.58, "Quaternário", "#F9F97F"],
	[23.03, "Neógeno", "#FFE619"],
	[66, "Paleógeno", "#FD9A52"],
	[145, "Cretáceo", "#7FC64E"],
	[201.4, "Jurássico", "#34B2C9"],
	[251.9, "Triássico", "#812B92"],
	[298.9, "Permiano", "#F04028"],
	[358.9, "Carbonífero", "#67A599"],
	[419.2, "Devoniano", "#CB8C37"],
	[443.8, "Siluriano", "#B3E1B6"],
	[485.4, "Ordoviciano", "#009270"],
	[538.8, "Cambriano", "#7FA056"],
	[1_000, "Neoproterozoico", "#FEB342"],
	[1_600, "Mesoproterozoico", "#FDB462"],
	[2_500, "Paleoproterozoico", "#F74370"],
	[4_031, "Arqueano", "#F0047F"],
];

const UNKNOWN = "#9e9e9e";

export function icsColorForAge(ma: number | undefined): string {
	if (ma === undefined) return UNKNOWN;
	return ICS_PERIODS.find(([max]) => ma <= max)?.[2] ?? UNKNOWN;
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
