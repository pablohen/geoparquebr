/** RPCs for the rock unit pages; safe to import anywhere. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { UnitSlugSchema } from "./schemas";
import { findUnit, listUnits, searchUnits } from "./units.server";

export const getUnits = createServerFn({ method: "GET" }).handler(() =>
	listUnits(),
);

export const getUnit = createServerFn({ method: "GET" })
	.validator(z.object({ slug: UnitSlugSchema }))
	.handler(({ data }) => findUnit(data.slug));

export const searchUnitsFn = createServerFn({ method: "GET" })
	.validator(z.object({ q: z.string().trim().min(2).max(60) }))
	.handler(({ data }) => searchUnits(data.q));
