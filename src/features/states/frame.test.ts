import { describe, expect, it } from "vitest";
import { frameAround } from "./frame";
import { UfParamSchema } from "./schemas";
import { statePath } from "./states";

describe("frameAround", () => {
	it("pads a spread of points by a tenth on each side", () => {
		const [w, s, e, n] = frameAround([
			[-40, -8],
			[-35, -5],
		]) ?? [0, 0, 0, 0];
		expect(w).toBeCloseTo(-40.5);
		expect(e).toBeCloseTo(-34.5);
		expect(s).toBeCloseTo(-8.3);
		expect(n).toBeCloseTo(-4.7);
	});

	it("gives a single point a usable box", () => {
		const [w, s, e, n] = frameAround([[-39.7, -7.1]]) ?? [0, 0, 0, 0];
		expect(e - w).toBeCloseTo(0.6);
		expect(n - s).toBeCloseTo(0.6);
	});

	it("has nothing to frame without points", () => {
		expect(frameAround([])).toBeNull();
	});
});

describe("state URLs", () => {
	it("use the lower-case code and accept either case", () => {
		expect(statePath("PE")).toBe("/states/pe");
		expect(UfParamSchema.parse("pe")).toBe("PE");
		expect(UfParamSchema.safeParse("xx").success).toBe(false);
	});
});
