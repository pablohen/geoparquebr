/**
 * Server entry: runs every request inside Paraglide's middleware, so getLocale()
 * and m.* resolve to the request's locale (from its /en prefix) during SSR.
 */
import {
	createStartHandler,
	defaultStreamHandler,
} from "@tanstack/react-start/server";
import { paraglideMiddleware } from "./paraglide/server.js";

const fetch = createStartHandler(defaultStreamHandler);

export default {
	fetch(request: Request) {
		return paraglideMiddleware(request, () => fetch(request));
	},
};
