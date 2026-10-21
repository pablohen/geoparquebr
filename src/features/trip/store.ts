/**
 * The trip being planned, kept on this device (localStorage) like favourites:
 * no account, works offline, never sent to the server.
 */
import { z } from "zod";
import { createLocalStore } from "~/lib/local-store";
import { MAX_TRIP_STOPS, type TripStop, TripStopSchema } from "./schemas";

const STORAGE_KEY = "geoparquebr:trip:v1";
const EMPTY: TripStop[] = Object.freeze([]) as unknown as TripStop[];

/** Stored JSON → stops, dropping invalid ones and repeats. */
export function parseTrip(raw: string | null): TripStop[] {
	if (!raw) return EMPTY;
	try {
		const data = z.array(z.unknown()).parse(JSON.parse(raw));
		const seen = new Set<string>();
		const out: TripStop[] = [];
		for (const value of data) {
			const stop = TripStopSchema.safeParse(value);
			if (!stop.success || seen.has(stop.data.slug)) continue;
			seen.add(stop.data.slug);
			out.push(stop.data);
		}
		return out.slice(0, MAX_TRIP_STOPS);
	} catch {
		return EMPTY;
	}
}

/** Appends stops not already in the trip, up to MAX_TRIP_STOPS. */
export function addStops(trip: TripStop[], stops: TripStop[]): TripStop[] {
	const have = new Set(trip.map((s) => s.slug));
	const fresh = stops.filter((s) => !have.has(s.slug));
	return [...trip, ...fresh].slice(0, MAX_TRIP_STOPS);
}

export const removeStop = (trip: TripStop[], slug: string) =>
	trip.filter((s) => s.slug !== slug);

/** Moves the stop at `from` one place up (-1) or down (+1). */
export function moveStop(
	trip: TripStop[],
	from: number,
	by: -1 | 1,
): TripStop[] {
	const to = from + by;
	if (to < 0 || to >= trip.length) return trip;
	const next = [...trip];
	[next[from], next[to]] = [next[to] as TripStop, next[from] as TripStop];
	return next;
}

const store = createLocalStore(STORAGE_KEY, parseTrip, EMPTY);

/** This device's trip; empty during SSR and hydration. */
export function useTrip() {
	const trip = store.use();
	return {
		trip,
		has: (slug: string) => trip.some((s) => s.slug === slug),
		full: trip.length >= MAX_TRIP_STOPS,
		add: (stops: TripStop[]) => store.write(addStops(store.read(), stops)),
		remove: (slug: string) => store.write(removeStop(store.read(), slug)),
		move: (from: number, by: -1 | 1) =>
			store.write(moveStop(store.read(), from, by)),
		replace: (stops: TripStop[]) => store.write(stops.slice(0, MAX_TRIP_STOPS)),
		clear: () => store.write([]),
	};
}

/** A trip stop from anything with a slug, names and a public location. */
export function toStop(g: {
	slug: string;
	name: string;
	municipality: string;
	state: string;
	geoparkId?: TripStop["geoparkId"];
	location: { coordinates: [number, number] };
	locationIsSensitive: boolean;
}): TripStop {
	return {
		slug: g.slug,
		name: g.name,
		municipality: g.municipality,
		state: g.state,
		...(g.geoparkId && { geoparkId: g.geoparkId }),
		point: g.location.coordinates,
		approximate: g.locationIsSensitive,
	};
}
