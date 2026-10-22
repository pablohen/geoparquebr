/** RPCs for the state pages; safe to import anywhere. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { RegionSchema, UfSchema } from "./schemas";
import { findRegionPage, findStatePage } from "./states.server";

export const getStatePage = createServerFn({ method: "GET" })
	.validator(z.object({ uf: UfSchema }))
	.handler(({ data }) => findStatePage(data.uf));

export const getRegionPage = createServerFn({ method: "GET" })
	.validator(z.object({ region: RegionSchema }))
	.handler(({ data }) => findRegionPage(data.region));
