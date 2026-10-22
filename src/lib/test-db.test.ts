import { describe, expect, it } from "vitest";
import { testDbName } from "./test-db";

// Regression: files started in the same millisecond got the same database
// and failed on each other's documents.
describe("testDbName", () => {
	it("differs between calls in the same millisecond", () => {
		const names = new Set(Array.from({ length: 50 }, () => testDbName()));
		expect(names.size).toBe(50);
	});

	it("stays a valid, prefixed MongoDB name", () => {
		expect(testDbName()).toMatch(/^geoparquebr_test_\d+_[0-9a-f]{8}$/);
		expect(testDbName("x").length).toBeLessThan(64);
	});
});
