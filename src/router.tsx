import { createRouter } from "@tanstack/react-router";
import { deLocalizeUrl, localizeUrl } from "./paraglide/runtime.js";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	return createRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreload: "intent",
		// Routes are written without a locale; /en/… is stripped on the way in
		// and added back to every link while the page is in English.
		rewrite: {
			input: ({ url }) => deLocalizeUrl(url),
			output: ({ url }) => localizeUrl(url),
		},
	});
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
