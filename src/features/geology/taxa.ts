/** Helpers for taxon names as recorded in fossil databases. */

/** Sentence-cases names recorded in ALL CAPS; leaves mixed case alone. */
export function tidyCase(name: string): string {
	const lower = name.toLowerCase();
	const base = name === name.toUpperCase() ? lower : name;
	return base.charAt(0).toUpperCase() + base.slice(1);
}

/**
 * "lepidosauria, squamata, tijubina pontei" → ["Lepidosauria", "Squamata", "Tijubina pontei"].
 * Commas also separate authorship years ("Dastilbe elongatus Santos, 1947"),
 * so a segment that starts with a year is glued back onto the previous one.
 */
export function splitTaxa(...lists: (string | undefined)[]): string[] {
	const out: string[] = [];
	for (const raw of lists.flatMap((l) => l?.split(/[,;]/) ?? [])) {
		const part = raw.trim();
		if (!part) continue;
		const last = out.at(-1);
		if (/^\(?\d{4}/.test(part) && last !== undefined)
			out[out.length - 1] = `${last}, ${part}`;
		else out.push(tidyCase(part));
	}
	return [...new Set(out)];
}

/**
 * Drops authorship for display: "Dastilbe elongatus Santos, 1947" →
 * "Dastilbe elongatus", "Dastilbe Jordan, 1910" → "Dastilbe".
 */
export function shortTaxon(name: string): string {
	const match = name.match(/^(.*?)[,\s]*\(?\d{4}\)?.*$/);
	if (!match?.[1]) return name;
	const words = match[1].trim().split(/\s+/);
	if (words.length >= 3) return words.slice(0, 2).join(" ");
	if (words[1] && /^[A-Z]/.test(words[1])) return words[0] ?? name;
	return words.join(" ");
}
