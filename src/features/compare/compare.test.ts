import { describe, expect, it } from "vitest";
import { CompareSearchSchema, scoreLeader } from "./compare";

describe("CompareSearchSchema", () => {
	it("keeps valid slugs and drops bad ones", () => {
		expect(
			CompareSearchSchema.parse({ a: "pedra-cariri", b: "Bad Slug" }),
		).toEqual({
			a: "pedra-cariri",
		});
	});
});

describe("scoreLeader", () => {
	it("favours the higher score", () => {
		expect(scoreLeader("tourism", 300, 200)).toBe("a");
		expect(scoreLeader("scientific", 100, 200)).toBe("b");
	});

	it("favours nobody on ties, missing scores or vulnerability", () => {
		expect(scoreLeader("tourism", 200, 200)).toBeNull();
		expect(scoreLeader("tourism", undefined, 200)).toBeNull();
		expect(scoreLeader("vulnerability", 380, 100)).toBeNull();
	});
});
