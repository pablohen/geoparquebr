/**
 * Two independent lookups so the fast one (our database) never waits for
 * the slow one (public place search, often several seconds).
 */
import { createServerFn } from "@tanstack/react-start";
import { cached } from "~/lib/cache.server";
import { searchGeosites } from "../geosites/geosites.server";
import { normalize } from "../geosites/geossit.server";
import { searchPlaces } from "./photon.server";
import { SearchQuerySchema } from "./schemas";

const DAY_MS = 24 * 60 * 60 * 1_000;

export const searchGeositesFn = createServerFn({ method: "GET" })
	.validator(SearchQuerySchema)
	.handler(({ data }) => searchGeosites(data.q));

/** An outage only hides places; it never fails the search box. */
export const searchPlacesFn = createServerFn({ method: "GET" })
	.validator(SearchQuerySchema)
	.handler(({ data }) =>
		cached(`places:v1:${normalize(data.q)}`, DAY_MS, () =>
			searchPlaces(data.q),
		).catch((err) => {
			console.warn("place search failed:", err);
			return [];
		}),
	);
