import { DEFAULT_THEME, mergeMantineTheme } from "@mantine/core";
import { describe, expect, it } from "vitest";
import { cssVariablesResolver, theme } from "./theme";

const full = mergeMantineTheme(DEFAULT_THEME, theme);

const rgb = (hex: string) =>
	[1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
const luminance = (c: number[]) => {
	const [r = 0, g = 0, b = 0] = c.map((v) => {
		const s = v / 255;
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: number[], b: number[]) => {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
};
const WHITE = [255, 255, 255];

// Light mode used shade 6 of the orange (3:1) for links and filled buttons,
// and "light" badges wrote yellow on pale yellow (2:1).
describe("light-mode contrast", () => {
	it("uses a primary shade that reaches 4.5:1 against white", () => {
		const shade =
			typeof full.primaryShade === "object" ? full.primaryShade.light : 0;
		const primary = full.colors.laterite?.[shade] ?? "#ffffff";
		expect(contrast(rgb(primary), WHITE)).toBeGreaterThanOrEqual(4.5);
	});

	it("darkens every colour's light-variant text enough for its background", () => {
		const vars = cssVariablesResolver(full).light;
		for (const [name, shades] of Object.entries(full.colors)) {
			expect(vars[`--mantine-color-${name}-light-color`]).toContain("black");
			// The text: shade 9 with 30% black; the background: shade 1, solid
			// since Mantine 9 (shade 9 alone misses 4.5:1 for teal to yellow).
			const text = rgb(shades[9]).map((v) => v * 0.7);
			const background = rgb(shades[1]);
			expect(contrast(text, background), name).toBeGreaterThanOrEqual(4.5);
		}
	});
});
