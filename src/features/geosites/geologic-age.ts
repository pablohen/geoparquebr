/**
 * A geosite's geological age, derived from the units SGB's geological map
 * shows at its location (GEOSSIT records carry no age). Pure, so the seed's
 * mapping can be tested without the network.
 */
import type { StrataUnit } from "~/features/geology/schemas";
import { formatAgeRange } from "~/features/geology/time-scale";
import type { GeositeInput } from "./schemas";

type GeologicAge = NonNullable<GeositeInput["geologicAge"]>;

/** Rank words that precede a unit's name, accent-free. */
const RANKS = "formacao|grupo|membro|suite|complexo|unidade|corpo";
const norm = (s: string) =>
	s
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/\s+/g, " ")
		.trim();
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A unit's name without its rank or qualifiers: "Grupo Santana" → "santana". */
export function distinctiveName(unitName: string): string {
	const name = norm(unitName).replace(new RegExp(`^(${RANKS}) `), "");
	return name.split(",")[0]?.trim() ?? "";
}

/**
 * Units a geosite's own text names ("…da Formacao Santana…"). Matched on the
 * name after any rank word, since GEOSSIT and the map often rank a unit
 * differently ("Formação Santana" vs "Grupo Santana"); "Santana" does not
 * match "Santana dos Garrotes".
 */
export function unitsNamedIn(text: string, units: StrataUnit[]): StrataUnit[] {
	const haystack = norm(text);
	return units.filter((u) => {
		const name = distinctiveName(u.name);
		return (
			name.length > 2 &&
			new RegExp(`\\b(?:${RANKS}) ${escapeRegex(name)}\\b(?! d[aoe]s? )`).test(
				haystack,
			)
		);
	});
}

const unique = (values: (string | undefined)[]) => [
	...new Set(values.filter((v): v is string => Boolean(v))),
];

/**
 * Units under one point (usually one; two or three on a contact) → one age
 * spanning all of them. Some map units carry "0–0 Ma" placeholders; those
 * ranges are ignored, keeping only the period name.
 */
export function geologicAgeFromUnits(
	units: StrataUnit[],
	mapScale: number,
): GeologicAge | undefined {
	if (units.length === 0) return undefined;
	const dated = units.filter((u) => (u.maxMa ?? 0) > 0);
	const mins = dated.map((u) => u.minMa ?? u.maxMa ?? 0);
	const maxes = dated.map((u) => u.maxMa ?? 0);
	const minMa = dated.length > 0 ? Math.min(...mins) : undefined;
	const maxMa = dated.length > 0 ? Math.max(...maxes) : undefined;
	const period =
		unique(units.map((u) => u.period)).join(" / ") ||
		formatAgeRange(minMa, maxMa);
	if (!period) return undefined;
	return {
		period: period.slice(0, 64),
		formation: unique(units.map((u) => u.name))
			.join(" / ")
			.slice(0, 128),
		minMa,
		maxMa,
		mapScale,
	};
}
