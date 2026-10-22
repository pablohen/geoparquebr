/**
 * Suggested itineraries: the best tourism-rated geosites that lie close
 * together, in a sensible order. Pure; points are public ones, so distances
 * to protected sites are approximate, as in the trip itself.
 */
import { haversineMeters } from "~/lib/geo";
import { pathMeters, suggestOrder } from "./route";
import type { TripStop } from "./schemas";

export type ItineraryCandidate = TripStop & { tourism: number };

/** One day: up to 4 stops within ~50 km of the best one. */
export const ONE_DAY = { radiusKm: 50, maxStops: 4 };
/** Two days: up to 8 stops within ~120 km, split into two halves. */
export const TWO_DAYS = { radiusKm: 120, maxStops: 8 };

export type Itineraries = {
	oneDay: TripStop[];
	/** Each day's stops; empty when there aren't enough geosites. */
	twoDays: [TripStop[], TripStop[]] | [];
};

/** Seeds tried: the best few, so one isolated top site doesn't sink the plan. */
const SEEDS = 5;

/**
 * Around each of the best few geosites, the best-rated ones within
 * `radiusKm`, up to `maxStops`; keeps the group with the highest total
 * tourism mark (at least two stops), ordered as a short path.
 */
function cluster(
	sorted: ItineraryCandidate[],
	{ radiusKm, maxStops }: { radiusKm: number; maxStops: number },
): TripStop[] {
	let best: ItineraryCandidate[] = [];
	let bestScore = 0;
	for (const seed of sorted.slice(0, SEEDS)) {
		const group = sorted
			.filter((c) => haversineMeters(seed.point, c.point) <= radiusKm * 1_000)
			.slice(0, maxStops);
		const score = group.reduce((n, c) => n + c.tourism, 0);
		if (group.length >= 2 && score > bestScore) {
			best = group;
			bestScore = score;
		}
	}
	const picked = best.map(({ tourism: _, ...stop }) => stop);
	return suggestOrder(picked.map((s) => s.point)).map(
		(i) => picked[i] as TripStop,
	);
}

export function suggestItineraries(
	candidates: ItineraryCandidate[],
): Itineraries {
	const sorted = [...candidates].sort(
		(a, b) => b.tourism - a.tourism || a.name.localeCompare(b.name, "pt"),
	);
	const oneDay = cluster(sorted, ONE_DAY);
	const long = cluster(sorted, TWO_DAYS);
	// Two days only pays off with more stops than one day already covers.
	if (long.length < 4 || long.length <= oneDay.length)
		return { oneDay, twoDays: [] };
	const half = Math.ceil(long.length / 2);
	return { oneDay, twoDays: [long.slice(0, half), long.slice(half)] };
}

/** Straight-line length of a day, in metres. */
export const dayMeters = (stops: TripStop[]) =>
	pathMeters(stops.map((s) => s.point));
