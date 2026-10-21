import { describe, expect, it } from "vitest";
import { parseMyGeosites, setFavourite, setVisited } from "./store";

const g = {
	slug: "pedra-cariri",
	name: "Pedra Cariri",
	municipality: "Nova Olinda",
	state: "CE",
	geoparkId: "araripe" as const,
};
const t1 = new Date("2026-10-21T10:00:00.000Z");
const t2 = new Date("2026-10-22T10:00:00.000Z");

describe("my geosites", () => {
	it("favourites and unfavourites, keeping a snapshot", () => {
		const fav = setFavourite({}, g, true, t1);
		expect(fav["pedra-cariri"]).toMatchObject({
			favourite: true,
			name: "Pedra Cariri",
			geoparkId: "araripe",
		});
		expect(setFavourite(fav, g, false, t2)).toEqual({});
	});

	it("keeps the first visit date when marked again", () => {
		const once = setVisited({}, g, true, t1);
		const again = setVisited(once, g, true, t2);
		expect(again["pedra-cariri"]?.visitedAt).toBe(t1.toISOString());
	});

	it("keeps an entry while either flag is set", () => {
		const both = setVisited(setFavourite({}, g, true, t1), g, true, t1);
		const unfav = setFavourite(both, g, false, t2);
		expect(unfav["pedra-cariri"]).toMatchObject({
			favourite: false,
			visitedAt: t1.toISOString(),
		});
		expect(setVisited(unfav, g, false, t2)).toEqual({});
	});

	it("survives storage round-trips and drops corrupt entries", () => {
		const state = setFavourite({}, g, true, t1);
		const raw = JSON.stringify({ ...state, bad: { slug: "x" } });
		expect(parseMyGeosites(raw)).toEqual(state);
		expect(parseMyGeosites("not json")).toEqual({});
		expect(parseMyGeosites(null)).toEqual({});
	});
});
