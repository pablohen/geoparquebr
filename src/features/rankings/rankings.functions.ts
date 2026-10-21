/** RPCs for the rankings page; safe to import anywhere. */
import { createServerFn } from "@tanstack/react-start";
import { findRankings } from "./rankings.server";
import { RankingsQuerySchema } from "./schemas";

export const getRankings = createServerFn({ method: "GET" })
	.validator(RankingsQuerySchema)
	.handler(({ data }) => findRankings(data));
