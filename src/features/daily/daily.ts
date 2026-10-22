/**
 * "Geossítio do dia": one geosite per day, the same for everyone, picked from
 * the date alone so it needs no stored state. Pure.
 */

/** The day in Brazil (São Paulo time) as "YYYY-MM-DD". */
export function dayKey(date: Date): string {
	// en-CA formats dates as YYYY-MM-DD.
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: "America/Sao_Paulo",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(date);
}

/** FNV-1a: a small, stable hash, so consecutive days land far apart. */
function hash(s: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

/** The day's pick among `slugs` (sorted, so the order can't vary by query). */
export function pickOfTheDay(slugs: string[], day: string): string | undefined {
	if (slugs.length === 0) return undefined;
	const sorted = [...slugs].sort();
	return sorted[hash(day) % sorted.length];
}
