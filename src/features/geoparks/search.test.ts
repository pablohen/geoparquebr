import { afterEach, describe, expect, it } from "vitest";
import { baseLocale, overwriteGetLocale } from "~/paraglide/runtime.js";
import { matchGeoparks } from "./search";

describe("matchGeoparks", () => {
	afterEach(() => overwriteGetLocale(() => baseLocale));

	it("matches names ignoring case and accents", () => {
		expect(matchGeoparks("serido")).toEqual(["serido"]);
		expect(matchGeoparks("CAÇAPAVA")).toEqual(["cacapava"]);
		expect(matchGeoparks("quarta col")).toEqual(["quarta-colonia"]);
	});

	it("needs every word, in any order", () => {
		expect(matchGeoparks("sul canions")).toEqual([
			"caminhos-dos-canions-do-sul",
		]);
		expect(matchGeoparks("araripe sul")).toEqual([]);
	});

	it("matches the localised name", () => {
		overwriteGetLocale(() => "es");
		expect(matchGeoparks("tierra de gigantes")).toEqual(["uberaba"]);
	});

	it("returns nothing for blank input", () => {
		expect(matchGeoparks("  ")).toEqual([]);
	});
});
