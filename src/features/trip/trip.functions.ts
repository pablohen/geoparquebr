/** RPCs for the trip page; safe to import anywhere. */
import { createServerFn } from "@tanstack/react-start";
import { ItinerariesQuerySchema, TripSlugsSchema } from "./schemas";
import { findItineraries, findTripStops } from "./trip.server";

export const getTripStops = createServerFn({ method: "GET" })
	.validator(TripSlugsSchema)
	.handler(({ data }) => findTripStops([...new Set(data.slugs)]));

export const getItineraries = createServerFn({ method: "GET" })
	.validator(ItinerariesQuerySchema)
	.handler(({ data }) => findItineraries(data));
