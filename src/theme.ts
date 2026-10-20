import { createTheme, type MantineColorsTuple } from "@mantine/core";

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
	colors: { laterite },
	fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
	defaultRadius: "md",
});
