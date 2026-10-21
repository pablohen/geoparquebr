/** RPCs for the "Novidades" page; safe to import anywhere. */
import { createServerFn } from "@tanstack/react-start";
import { listChanges } from "./news.server";

export const getChanges = createServerFn({ method: "GET" }).handler(() =>
	listChanges(),
);
