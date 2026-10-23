import {
	Anchor,
	Center,
	MantineProvider,
	mantineHtmlProps,
	Stack,
	Title,
} from "@mantine/core";
import mantineCss from "@mantine/core/styles.css?url";
import nprogressCss from "@mantine/nprogress/styles.css?url";
import {
	createRootRoute,
	HeadContent,
	Link,
	Outlet,
	ScriptOnce,
	Scripts,
} from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import { ogLocaleTags } from "~/features/geosites/seo";
// Loaded with the root, not a page chunk: Chrome fires beforeinstallprompt
// once, early, and a listener in a lazily loaded chunk would miss it.
import "~/features/install/prompt";
import { getLocale } from "~/lib/i18n";
import { RouteProgress } from "~/lib/route-progress";
import { DEFAULT_OG_IMAGE, SITE_NAME } from "~/lib/site";
import { m } from "~/paraglide/messages.js";
import appCss from "~/styles/app.css?url";
import { cssVariablesResolver, theme } from "~/theme";

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
			{ title: m.site_title() },
			{ name: "description", content: m.site_description() },
			{ name: "theme-color", content: "#1f1f22" },
			{ name: "mobile-web-app-capable", content: "yes" },
			{ name: "apple-mobile-web-app-title", content: SITE_NAME },
			{
				name: "apple-mobile-web-app-status-bar-style",
				content: "black-translucent",
			},
			// Share-preview defaults; geosite pages override title/description/image/url.
			{ property: "og:site_name", content: SITE_NAME },
			...ogLocaleTags(),
			{ property: "og:type", content: "website" },
			{ property: "og:title", content: SITE_NAME },
			{ property: "og:description", content: m.site_description() },
			{ property: "og:image", content: DEFAULT_OG_IMAGE },
			{ name: "twitter:card", content: "summary_large_image" },
		],
		links: [
			{ rel: "stylesheet", href: mantineCss },
			{ rel: "stylesheet", href: nprogressCss },
			{ rel: "stylesheet", href: appCss },
			{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
			{ rel: "manifest", href: "/manifest.webmanifest" },
			{ rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
		],
	}),
	component: RootComponent,
	notFoundComponent: NotFound,
});

/**
 * Registers public/sw.js (install + offline). Production only: in dev it
 * would cache Vite's unhashed modules and serve stale code.
 */
function useServiceWorker() {
	useEffect(() => {
		if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
		// Maps embedded on other sites don't need the app's offline cache.
		if (/^(\/(en|es))?\/embed\//.test(location.pathname)) return;
		navigator.serviceWorker.register("/sw.js").catch((err) => {
			console.warn("service worker registration failed:", err);
		});
	}, []);
}

function NotFound() {
	return (
		<Center h="100dvh">
			<Stack align="center" gap="xs">
				<Title order={1} size="h2">
					{m.not_found_title()}
				</Title>
				<Anchor component={Link} to="/">
					{m.back_to_map()}
				</Anchor>
			</Stack>
		</Center>
	);
}

function RootComponent() {
	useServiceWorker();
	return (
		<RootDocument>
			<Outlet />
		</RootDocument>
	);
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<html lang={getLocale()} {...mantineHtmlProps}>
			<head>
				<ScriptOnce>{COLOR_SCHEME_SCRIPT}</ScriptOnce>
				<HeadContent />
			</head>
			<body>
				<MantineProvider
					theme={theme}
					cssVariablesResolver={cssVariablesResolver}
					defaultColorScheme="auto"
				>
					<RouteProgress />
					{children}
				</MantineProvider>
				<Scripts />
			</body>
		</html>
	);
}
