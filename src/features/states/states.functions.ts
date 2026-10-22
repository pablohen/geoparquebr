/** RPCs for the state pages; safe to import anywhere. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { UfSchema } from "./schemas";
import { findStatePage } from "./states.server";

export const getStatePage = createServerFn({ method: "GET" })
	.validator(z.object({ uf: UfSchema }))
	.handler(({ data }) => findStatePage(data.uf));
