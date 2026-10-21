/** RPCs for the trip page; safe to import anywhere. */
import { createServerFn } from "@tanstack/react-start";
import { TripSlugsSchema } from "./schemas";
import { findTripStops } from "./trip.server";

export const getTripStops = createServerFn({ method: "GET" })
	.validator(TripSlugsSchema)
	.handler(({ data }) => findTripStops([...new Set(data.slugs)]));
