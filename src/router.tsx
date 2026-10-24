import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { deLocalizeUrl, localizeUrl } from "./paraglide/runtime.js";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	// One client per router, i.e. per request on the server: a shared one would
	// leak cached data between visitors.
	const queryClient = new QueryClient();
	const router = createRouter({
		routeTree,
		context: { queryClient },
		scrollRestoration: true,
		defaultPreload: "intent",
		// Routes are written without a locale; /en/… is stripped on the way in
		// and added back to every link while the page is in English.
		rewrite: {
			input: ({ url }) => deLocalizeUrl(url),
			output: ({ url }) => localizeUrl(url),
		},
	});
	// Dehydrates queries fetched during SSR into the page, and wraps the app in
	// QueryClientProvider.
	setupRouterSsrQueryIntegration({ router, queryClient });
	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
