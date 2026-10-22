import {
	Anchor,
	type CSSVariablesResolver,
	createTheme,
	type MantineColorsTuple,
} from "@mantine/core";

/** Laterite/sandstone orange — the Chapada do Araripe palette. */
const laterite: MantineColorsTuple = [
	"#fff3ec",
	"#fde4d6",
	"#f7c6aa",
	"#f2a67b",
	"#ed8b53",
	"#ea7a3a",
	"#e9712c",
	"#cf5f20",
	"#b9531a",
	"#a24511",
];

export const theme = createTheme({
	primaryColor: "laterite",
	// Shade 6 (#e9712c) is 3:1 on white, for links and under white button text;
	// shade 8 reaches 4.9:1. Dark mode already used 8.
	primaryShade: { light: 8, dark: 8 },
	colors: { laterite },
	fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
	defaultRadius: "md",
	components: {
		// Links inside text need more than colour to stand out (WCAG 1.4.1).
		Anchor: Anchor.extend({ defaultProps: { underline: "always" } }),
	},
});

/**
 * Mantine's "dimmed" greys miss WCAG AA contrast for body text (4.03:1 on
 * the dark background, ~3.3:1 on white); these reach 4.5:1 or more.
 */
export const cssVariablesResolver: CSSVariablesResolver = (t) => ({
	variables: {},
	light: {
		"--mantine-color-dimmed": "#5f656d",
		// "light" badges and buttons write shade 9 on shade 1; teal, green,
		// lime, yellow and orange miss 4.5:1 that way. Shade 9 with 30% black
		// passes for every colour (5:1 or more).
		...Object.fromEntries(
			Object.keys(t.colors).map((c) => [
				`--mantine-color-${c}-light-color`,
				`color-mix(in srgb, var(--mantine-color-${c}-9) 70%, black)`,
			]),
		),
	},
	dark: { "--mantine-color-dimmed": "#9c9c9c" },
});
