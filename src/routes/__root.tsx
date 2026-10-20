import {
	Anchor,
	Center,
	MantineProvider,
	mantineHtmlProps,
	Stack,
	Title,
} from "@mantine/core";
import mantineCss from "@mantine/core/styles.css?url";
import {
	createRootRoute,
	HeadContent,
	Link,
	Outlet,
	ScriptOnce,
	Scripts,
} from "@tanstack/react-router";
import maplibreCss from "maplibre-gl/dist/maplibre-gl.css?url";
import type { ReactNode } from "react";
import { DEFAULT_OG_IMAGE, SITE_DESCRIPTION, SITE_NAME } from "~/lib/site";
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
			{ name: "description", content: SITE_DESCRIPTION },
			{ name: "theme-color", content: "#1f1f22" },
			// Share-preview defaults; geosite pages override title/description/image/url.
			{ property: "og:site_name", content: SITE_NAME },
			{ property: "og:locale", content: "pt_BR" },
			{ property: "og:type", content: "website" },
			{ property: "og:title", content: SITE_NAME },
			{ property: "og:description", content: SITE_DESCRIPTION },
			{ property: "og:image", content: DEFAULT_OG_IMAGE },
			{ name: "twitter:card", content: "summary_large_image" },
		],
		links: [
			{ rel: "stylesheet", href: mantineCss },
			{ rel: "stylesheet", href: maplibreCss },
			{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
		],
	}),
	component: RootComponent,
	notFoundComponent: NotFound,
});

function NotFound() {
	return (
		<Center h="100dvh">
			<Stack align="center" gap="xs">
				<Title order={1} size="h2">
					Página não encontrada
				</Title>
				<Anchor component={Link} to="/">
					Voltar ao mapa
				</Anchor>
			</Stack>
		</Center>
	);
}

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
