/** RPCs for the geosite of the day; safe to import anywhere. */
import { createServerFn } from "@tanstack/react-start";
import { findGeositeOfTheDay } from "./daily.server";

export const getGeositeOfTheDay = createServerFn({ method: "GET" }).handler(
	() => findGeositeOfTheDay(),
);
