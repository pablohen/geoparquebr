/** RPCs for the geopark pages; safe to import anywhere. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GeoparkIdSchema } from "~/features/geosites/schemas";
import { countGeositesByGeopark, findGeoparkGeosites } from "./geoparks.server";

export const getGeoparkGeosites = createServerFn({ method: "GET" })
	.validator(z.object({ id: GeoparkIdSchema }))
	.handler(({ data }) => findGeoparkGeosites(data.id));

export const getGeoparkCounts = createServerFn({ method: "GET" }).handler(() =>
	countGeositesByGeopark(),
);
