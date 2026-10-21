import { describe, expect, it } from "vitest";
import {
	googleMapsTripUrls,
	legMeters,
	POINTS_PER_LINK,
	pathMeters,
	suggestOrder,
} from "./route";

// Stops along a line of longitude, ~111 km apart, listed out of order.
const line: [number, number][] = [
	[-39, -7],
	[-39, -9],
	[-39, -6],
	[-39, -8],
];

describe("suggestOrder", () => {
	it("visits stops along a line in sequence, from one end", () => {
		const order = suggestOrder(line);
		const lats = order.map((i) => line[i]?.[1]);
		expect([lats, [...lats].reverse()]).toContainEqual([-6, -7, -8, -9]);
	});

	it("starts nearest the given start point", () => {
		const order = suggestOrder(line, [-39, -10]);
		expect(order.map((i) => line[i]?.[1])).toEqual([-9, -8, -7, -6]);
	});

	it("never makes a path longer than the order given", () => {
		const zigzag: [number, number][] = [
			[-40, -7],
			[-38, -7.1],
			[-40, -7.2],
			[-38, -7.3],
			[-40, -7.4],
			[-38, -7.5],
		];
		const order = suggestOrder(zigzag);
		expect(order.slice().sort()).toEqual([0, 1, 2, 3, 4, 5]);
		expect(
			pathMeters(order.map((i) => zigzag[i] as [number, number])),
		).toBeLessThan(pathMeters(zigzag));
	});

	it("handles empty and single-stop trips", () => {
		expect(suggestOrder([])).toEqual([]);
		expect(suggestOrder([[-39, -7]])).toEqual([0]);
	});
});

describe("legMeters", () => {
	it("measures from the start, then stop to stop", () => {
		const legs = legMeters(
			[
				[-39, -7],
				[-39, -8],
			],
			[-39, -6],
		);
		expect(legs.map((m) => Math.round(m / 1000))).toEqual([111, 111]);
		expect(legMeters([[-39, -7]])).toEqual([0]);
	});
});

describe("googleMapsTripUrls", () => {
	const params = (url: string) => new URL(url).searchParams;

	it("links a short trip from the traveller's location", () => {
		const [url, ...rest] = googleMapsTripUrls(line);
		expect(rest).toEqual([]);
		const p = params(url ?? "");
		expect(p.get("origin")).toBeNull();
		expect(p.get("destination")).toBe("-8,-39");
		expect(p.get("waypoints")).toBe("-7,-39|-9,-39|-6,-39");
	});

	it("starts from a given point", () => {
		const [url] = googleMapsTripUrls(line.slice(0, 1), [-38.5, -6.5]);
		expect(params(url ?? "").get("origin")).toBe("-6.5,-38.5");
	});

	it("splits long trips into legs that join up", () => {
		const many = Array.from(
			{ length: 20 },
			(_, i) => [-39, -5 - i / 10] as [number, number],
		);
		const urls = googleMapsTripUrls(many);
		expect(urls).toHaveLength(3);
		for (const url of urls) {
			const p = params(url);
			const waypoints = p.get("waypoints")?.split("|") ?? [];
			expect(waypoints.length + 2).toBeLessThanOrEqual(POINTS_PER_LINK);
		}
		// Each leg starts where the previous one ended.
		expect(params(urls[1] ?? "").get("origin")).toBe(
			params(urls[0] ?? "").get("destination"),
		);
		expect(params(urls[2] ?? "").get("destination")).toBe("-6.9,-39");
	});
});
