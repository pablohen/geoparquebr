import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_BBOX } from "./schemas";

const manifest = JSON.parse(
	readFileSync(join(process.cwd(), "public/manifest.webmanifest"), "utf8"),
);

describe("PWA manifest", () => {
	it("starts on the default viewport URL (so it can be served offline)", () => {
		const url = new URL(manifest.start_url, "https://example.org");
		expect(url.pathname).toBe("/");
		expect(JSON.parse(url.searchParams.get("bbox") ?? "null")).toEqual(
			DEFAULT_BBOX,
		);
	});

	it("declares installable icons, including a maskable one", () => {
		const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
		expect(sizes).toContain("192x192");
		expect(sizes).toContain("512x512");
		expect(
			manifest.icons.some(
				(i: { purpose?: string }) => i.purpose === "maskable",
			),
		).toBe(true);
	});
});
