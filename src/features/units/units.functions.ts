/** RPCs for the rock unit pages; safe to import anywhere. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { UnitSlugSchema } from "./schemas";
import { findUnit, listUnits } from "./units.server";

export const getUnits = createServerFn({ method: "GET" }).handler(() =>
	listUnits(),
);

export const getUnit = createServerFn({ method: "GET" })
	.validator(z.object({ slug: UnitSlugSchema }))
	.handler(({ data }) => findUnit(data.slug));
