/** RPCs for the conservation page; safe to import anywhere. */
import { createServerFn } from "@tanstack/react-start";
import { findConservation } from "./conservation.server";

export const getConservation = createServerFn({ method: "GET" }).handler(() =>
	findConservation(),
);
