import { describe, expect, it } from "vitest";
import { installMode } from "./install";

const IPHONE_SAFARI =
	"Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPHONE_CHROME =
	"Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1";
const ANDROID_CHROME =
	"Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";

const base = { standalone: false, hasPrompt: false, dismissed: false };

describe("installMode", () => {
	it("uses the browser's prompt when there is one", () => {
		expect(
			installMode({ ...base, userAgent: ANDROID_CHROME, hasPrompt: true }),
		).toBe("prompt");
	});

	it("explains Add to Home Screen on iOS Safari only", () => {
		expect(installMode({ ...base, userAgent: IPHONE_SAFARI })).toBe("ios");
		expect(installMode({ ...base, userAgent: IPHONE_CHROME })).toBeNull();
		expect(installMode({ ...base, userAgent: ANDROID_CHROME })).toBeNull();
	});

	it("hides once installed or dismissed", () => {
		expect(
			installMode({ ...base, userAgent: IPHONE_SAFARI, standalone: true }),
		).toBeNull();
		expect(
			installMode({
				...base,
				userAgent: ANDROID_CHROME,
				hasPrompt: true,
				dismissed: true,
			}),
		).toBeNull();
	});
});
