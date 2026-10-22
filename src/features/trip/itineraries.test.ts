import { describe, expect, it } from "vitest";
import { type ItineraryCandidate, suggestItineraries } from "./itineraries";

const stop = (
	slug: string,
	point: [number, number],
	tourism: number,
): ItineraryCandidate => ({
	slug,
	name: slug,
	municipality: "X",
	state: "PB",
	point,
	approximate: false,
	tourism,
});

// About 11 km per 0.1° of latitude.
const near = (i: number, t: number) =>
	stop(`near-${i}`, [-38, -7 - i * 0.1], t);

describe("suggestItineraries", () => {
	// Regression: an isolated top-rated geosite used to leave no plan at all.
	it("starts from the best group, not an isolated best geosite", () => {
		const { oneDay } = suggestItineraries([
			stop("far", [-45, -20], 390),
			near(0, 300),
			near(1, 200),
		]);
		expect(oneDay.map((s) => s.slug).sort()).toEqual(["near-0", "near-1"]);
	});

	it("has no plan without two geosites close together", () => {
		expect(
			suggestItineraries([
				stop("a", [-45, -20], 300),
				stop("b", [-38, -7], 200),
			]).oneDay,
		).toEqual([]);
	});

	it("keeps up to four stops within 50 km, in path order", () => {
		const { oneDay } = suggestItineraries([
			near(0, 300),
			near(3, 250),
			near(1, 200),
			near(2, 150),
			near(4, 100),
		]);
		expect(oneDay.map((s) => s.slug).sort()).toEqual(
			["near-0", "near-1", "near-2", "near-3"].sort(),
		);
		// Ordered along the line, not by score.
		const lats = oneDay.map((s) => s.point[1]);
		const sorted = [...lats].sort((a, b) => a - b);
		expect(lats.join()).toMatch(
			new RegExp(`^(${sorted.join()}|${[...sorted].reverse().join()})$`),
		);
	});

	it("splits a wider set into two days", () => {
		const stops = Array.from({ length: 8 }, (_, i) => near(i, 300 - i));
		const { twoDays } = suggestItineraries(stops);
		expect(twoDays).toHaveLength(2);
		const [a = [], b = []] = twoDays;
		expect(a.length + b.length).toBe(8);
		expect(new Set([...a, ...b].map((s) => s.slug)).size).toBe(8);
		expect(a[0]).not.toHaveProperty("tourism");
	});

	it("offers no two-day plan when one day already covers everything", () => {
		expect(suggestItineraries([near(0, 300), near(1, 200)]).twoDays).toEqual(
			[],
		);
	});
});
