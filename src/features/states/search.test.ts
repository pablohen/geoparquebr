import { describe, expect, it } from "vitest";
import { matchRegions, matchStates } from "./search";

describe("matchStates", () => {
	it("matches names without accents, every word", () => {
		expect(matchStates("sao paulo")).toEqual(["SP"]);
		expect(matchStates("paraiba")).toEqual(["PB"]);
		expect(matchStates("grande")).toEqual(["RN", "RS"]);
	});

	it("matches a two-letter query only as a state code", () => {
		expect(matchStates("pe")).toEqual(["PE"]);
		expect(matchStates("xx")).toEqual([]);
	});

	it("keeps a few", () => {
		expect(matchStates("a").length).toBeLessThanOrEqual(3);
	});
});

describe("matchRegions", () => {
	it("matches region names", () => {
		expect(matchRegions("nordeste")).toEqual(["nordeste"]);
		expect(matchRegions("centro")).toEqual(["centro-oeste"]);
		expect(matchRegions("sul")).toEqual(["sul"]);
	});
});
