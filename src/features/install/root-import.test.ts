import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

// Regression: the listener shipped in a page chunk, so on pages other than
// the map Chrome's one-off beforeinstallprompt fired before it existed and
// "Instalar app" never appeared.
it("loads the install listener with the root route", () => {
	const root = readFileSync("src/routes/__root.tsx", "utf8");
	expect(root).toMatch(/^import "~\/features\/install\/prompt";$/m);
});
