import { describe, expect, it } from "vitest";
import { imageFailed, photoStatus } from "./image";

// Regression: Pedra Cariri's dead GEOSSIT photo failed before hydration, so
// onError never ran and the page showed a broken-image box.
describe("imageFailed", () => {
	it("is true for a finished image with no pixels", () => {
		expect(imageFailed({ complete: true, naturalWidth: 0 })).toBe(true);
	});

	it("is false while loading (or not started, as with loading=lazy)", () => {
		expect(imageFailed({ complete: false, naturalWidth: 0 })).toBe(false);
	});

	it("is false for a loaded image", () => {
		expect(imageFailed({ complete: true, naturalWidth: 640 })).toBe(false);
	});
});

describe("photoStatus", () => {
	const res = (ok: boolean, type: string | null) => ({
		ok,
		headers: { get: () => type },
	});

	it("accepts a successful image response", () => {
		expect(photoStatus(res(true, "image/jpeg"))).toBe("ok");
	});

	// Pedra Cariri's link answers 404 (and some dead links answer 200 with an HTML page).
	it("marks HTTP errors and non-images as dead", () => {
		expect(photoStatus(res(false, "text/html"))).toBe("dead");
		expect(photoStatus(res(true, "text/html"))).toBe("dead");
		expect(photoStatus(res(true, null))).toBe("dead");
	});
});
