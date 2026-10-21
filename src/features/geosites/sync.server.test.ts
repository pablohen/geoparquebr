import { describe, expect, it } from "vitest";
import { assertPlausibleImport } from "./sync.server";

describe("assertPlausibleImport", () => {
	it("allows normal growth and shrinkage", () => {
		expect(() => assertPlausibleImport(319, 319)).not.toThrow();
		expect(() => assertPlausibleImport(300, 319)).not.toThrow();
		expect(() => assertPlausibleImport(400, 319)).not.toThrow();
		// A first seed into an empty database.
		expect(() => assertPlausibleImport(319, 0)).not.toThrow();
	});

	it("refuses to prune on a response that looks truncated", () => {
		expect(() => assertPlausibleImport(100, 319)).toThrow(/truncated/);
		expect(() => assertPlausibleImport(0, 319)).toThrow();
	});
});
