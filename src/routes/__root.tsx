import { MantineProvider, mantineHtmlProps } from "@mantine/core";
import mantineCss from "@mantine/core/styles.css?url";
import {
	createRootRoute,
	HeadContent,
	Outlet,
	ScriptOnce,
	Scripts,
} from "@tanstack/react-router";
import maplibreCss from "maplibre-gl/dist/maplibre-gl.css?url";
import type { ReactNode } from "react";
import { theme } from "~/theme";

/**
 * Same as Mantine's <ColorSchemeScript defaultColorScheme="auto" />, but via
 * ScriptOnce: React 19 warns when a hydrated component renders a <script>.
 */
const COLOR_SCHEME_SCRIPT = `try {
	var s = localStorage.getItem("mantine-color-scheme-value");
	var scheme = s === "light" || s === "dark" ? s : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
	document.documentElement.setAttribute("data-mantine-color-scheme", scheme);
} catch (e) {}`;

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "GeoparqueBR — Geoparques Mundiais da UNESCO no Brasil" },
			{
				name: "description",
				content:
					"Explore geossítios, estratos, fósseis e cavernas cársticas dos geoparques brasileiros.",
			},
		],
		links: [
			{ rel: "stylesheet", href: mantineCss },
			{ rel: "stylesheet", href: maplibreCss },
		],
	}),
	component: RootComponent,
});

function RootComponent() {
	return (
		<RootDocument>
			<Outlet />
		</RootDocument>
	);
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<html lang="pt-BR" {...mantineHtmlProps}>
			<head>
				<ScriptOnce>{COLOR_SCHEME_SCRIPT}</ScriptOnce>
				<HeadContent />
			</head>
			<body>
				<MantineProvider theme={theme} defaultColorScheme="auto">
					{children}
				</MantineProvider>
				<Scripts />
			</body>
		</html>
	);
}
