/** RPCs for the numbers, timeline and comparison pages; safe to import anywhere. */
import { createServerFn } from "@tanstack/react-start";
import { loadGeositeStats, loadTimeline } from "./stats.server";

export const getGeositeStats = createServerFn({ method: "GET" }).handler(() =>
	loadGeositeStats(),
);

export const getTimeline = createServerFn({ method: "GET" }).handler(() =>
	loadTimeline(),
);
