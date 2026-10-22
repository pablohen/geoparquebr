/** RPCs for the data-quality page; safe to import anywhere. */
import { createServerFn } from "@tanstack/react-start";
import { findDataQuality } from "./quality.server";

export const getDataQuality = createServerFn({ method: "GET" }).handler(() =>
	findDataQuality(),
);
