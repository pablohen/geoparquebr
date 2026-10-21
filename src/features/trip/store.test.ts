import { describe, expect, it } from "vitest";
import { MAX_TRIP_STOPS, parseTripSlugs, type TripStop } from "./schemas";
import { addStops, moveStop, parseTrip, removeStop, toStop } from "./store";

const stop = (id: string): TripStop => ({
	slug: `site-${id}`,
	name: id,
	municipality: "Nova Olinda",
	state: "CE",
	point: [-39.7, -7.1],
	approximate: false,
});

describe("parseTrip", () => {
	it("keeps valid stops in order, without repeats", () => {
		const raw = JSON.stringify([
			stop("a"),
			{ slug: "bad" },
			stop("b"),
			stop("a"),
		]);
		expect(parseTrip(raw).map((s) => s.name)).toEqual(["a", "b"]);
	});

	it("is empty for missing or broken storage", () => {
		expect(parseTrip(null)).toEqual([]);
		expect(parseTrip("{not json")).toEqual([]);
		expect(parseTrip('{"a":1}')).toEqual([]);
	});
});

describe("trip edits", () => {
	const trip = [stop("a"), stop("b"), stop("c")];

	it("adds only new stops, up to the limit", () => {
		expect(addStops(trip, [stop("b"), stop("d")]).map((s) => s.name)).toEqual([
			"a",
			"b",
			"c",
			"d",
		]);
		const many = Array.from({ length: MAX_TRIP_STOPS + 5 }, (_, i) =>
			stop(`s${i}`),
		);
		expect(addStops([], many)).toHaveLength(MAX_TRIP_STOPS);
	});

	it("moves a stop one place and ignores moves past the ends", () => {
		expect(moveStop(trip, 0, 1).map((s) => s.name)).toEqual(["b", "a", "c"]);
		expect(moveStop(trip, 2, -1).map((s) => s.name)).toEqual(["a", "c", "b"]);
		expect(moveStop(trip, 0, -1)).toBe(trip);
		expect(moveStop(trip, 2, 1)).toBe(trip);
	});

	it("removes a stop by slug", () => {
		expect(removeStop(trip, "site-b").map((s) => s.name)).toEqual(["a", "c"]);
	});
});

describe("toStop", () => {
	it("keeps the public point and flags sensitive geosites as approximate", () => {
		expect(
			toStop({
				slug: "gruta",
				name: "Gruta",
				municipality: "X",
				state: "BA",
				location: { coordinates: [-41.1, -12.5] },
				locationIsSensitive: true,
			}),
		).toEqual({
			slug: "gruta",
			name: "Gruta",
			municipality: "X",
			state: "BA",
			point: [-41.1, -12.5],
			approximate: true,
		});
	});
});

// Regression: the shared link's slugs must survive the router re-validating search.
describe("parseTripSlugs", () => {
	it("splits, drops invalid slugs and repeats, and caps the count", () => {
		expect(
			parseTripSlugs("pedra-cariri,Bad Slug,,pedra-cariri,mina-brejui"),
		).toEqual(["pedra-cariri", "mina-brejui"]);
		expect(parseTripSlugs(undefined)).toEqual([]);
		const many = Array.from({ length: 30 }, (_, i) => `site-${i}`).join(",");
		expect(parseTripSlugs(many)).toHaveLength(MAX_TRIP_STOPS);
	});
});
