import { afterEach, describe, expect, it, vi } from "vitest";
import { autoHideAttribution, collapseAttribution } from "./map-attribution";

const el = (...classes: string[]) => {
	const set = new Set(classes);
	return {
		classList: {
			contains: (c: string) => set.has(c),
			remove: (...cs: string[]) => {
				for (const c of cs) set.delete(c);
			},
		},
		has: (c: string) => set.has(c),
	};
};

describe("collapseAttribution", () => {
	it("collapses an expanded compact attribution to its button", () => {
		const a = el("maplibregl-compact", "maplibregl-compact-show");
		collapseAttribution(a);
		expect(a.has("maplibregl-compact-show")).toBe(false);
		expect(a.has("maplibregl-compact")).toBe(true);
	});

	it("leaves a full-width, non-compact attribution alone", () => {
		const a = el("maplibregl-compact-show");
		collapseAttribution(a);
		expect(a.has("maplibregl-compact-show")).toBe(true);
		expect(() => collapseAttribution(null)).not.toThrow();
	});
});

describe("autoHideAttribution", () => {
	afterEach(() => vi.useRealTimers());

	it("collapses after five seconds, not before, and can be cancelled", () => {
		vi.useFakeTimers();
		const a = el("maplibregl-compact", "maplibregl-compact-show");
		const container = { querySelector: () => a } as unknown as HTMLElement;
		autoHideAttribution(container);
		vi.advanceTimersByTime(4_999);
		expect(a.has("maplibregl-compact-show")).toBe(true);
		vi.advanceTimersByTime(1);
		expect(a.has("maplibregl-compact-show")).toBe(false);

		const b = el("maplibregl-compact", "maplibregl-compact-show");
		const cancel = autoHideAttribution({
			querySelector: () => b,
		} as unknown as HTMLElement);
		cancel();
		vi.advanceTimersByTime(10_000);
		expect(b.has("maplibregl-compact-show")).toBe(true);
	});
});
