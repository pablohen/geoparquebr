/** Helpers for taxon names as recorded in fossil databases. */

/** Sentence-cases names recorded in ALL CAPS; leaves mixed case alone. */
export function tidyCase(name: string): string {
	const lower = name.toLowerCase();
	const base = name === name.toUpperCase() ? lower : name;
	return base.charAt(0).toUpperCase() + base.slice(1);
}

/**
 * A segment that is only an authorship: "1947", "Agassiz, 1841" (split at
 * the comma, so "Agassiz" alone is not one), "Jordan & Branner, 1908".
 */
const AUTHOR = String.raw`\p{Lu}[\p{L}.'-]*`;
const AUTHORSHIP = new RegExp(
	String.raw`^\(?(?:${AUTHOR}(?:\s+(?:&|e|et|and)\s+${AUTHOR})*,?\s+)?\d{4}\)?$`,
	"u",
);

/**
 * "lepidosauria, squamata, tijubina pontei" → ["Lepidosauria", "Squamata", "Tijubina pontei"].
 * Commas and semicolons also end up inside authorships ("Dastilbe elongatus
 * Santos, 1947", "Tharrhias araripis; Jordan & Branner, 1908"), so a segment
 * that is only an authorship is glued back onto the previous name. Group
 * headers lose their colon ("Peixes:" → "Peixes").
 */
export function splitTaxa(...lists: (string | undefined)[]): string[] {
	// First glue years onto the segment before ("Branner" + "1908"), then
	// whole authorships onto the name before them.
	const segments: string[] = [];
	for (const raw of lists.flatMap((l) => l?.split(/[,;]/) ?? [])) {
		const part = raw.trim().replace(/:$/, "").trim();
		if (!part) continue;
		const last = segments.at(-1);
		if (/^\(?\d{4}/.test(part) && last !== undefined)
			segments[segments.length - 1] = `${last}, ${part}`;
		else segments.push(part);
	}
	const out: string[] = [];
	for (const part of segments) {
		const last = out.at(-1);
		// SGB often records whole names in lower case; test authors capitalised.
		if (last !== undefined && AUTHORSHIP.test(tidyAuthors(part)))
			out[out.length - 1] = `${last}, ${part}`;
		else out.push(tidyCase(part));
	}
	return [...new Set(out)];
}

/** "jordan & branner, 1908" → "Jordan & Branner, 1908", to test it as authorship. */
const tidyAuthors = (s: string) =>
	s.replace(/(^|[\s(])(\p{L})/gu, (_, pre, c) => pre + c.toUpperCase());

/**
 * Drops authorship for display: "Dastilbe elongatus Santos, 1947" →
 * "Dastilbe elongatus", "Dastilbe Jordan, 1910" → "Dastilbe".
 */
export function shortTaxon(name: string): string {
	const match = name.match(/^(.*?)[,\s]*\(?\d{4}\)?.*$/);
	if (!match?.[1]) return name;
	// The name ends at the first comma: "Tharrhias araripis, Jordan & Branner".
	const words = (match[1].split(",")[0] ?? "").trim().split(/\s+/);
	if (words.length >= 3) return words.slice(0, 2).join(" ");
	if (words[1] && /^[A-Z]/.test(words[1])) return words[0] ?? name;
	return words.join(" ");
}
