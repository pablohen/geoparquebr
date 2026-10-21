/** RPCs for the fossil pages and links; safe to import anywhere. */
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GeoparkIdSchema } from "~/features/geosites/schemas";
import {
	findFossilGenus,
	generaNearGeopark,
	generaNearGeosites,
	listFossilGenera,
	searchFossilGenera,
} from "./fossils.server";
import { GenusSlugSchema } from "./schemas";

export const getFossilGenera = createServerFn({ method: "GET" }).handler(() =>
	listFossilGenera(),
);

export const getFossilGenus = createServerFn({ method: "GET" })
	.validator(z.object({ slug: GenusSlugSchema }))
	.handler(async ({ data }) => {
		const genus = await findFossilGenus(data.slug);
		if (!genus) throw notFound();
		return genus;
	});

export const getGeositeGenera = createServerFn({ method: "GET" })
	.validator(z.object({ slug: z.string().min(1) }))
	.handler(({ data }) => generaNearGeosites([data.slug]));

export const getGeoparkGenera = createServerFn({ method: "GET" })
	.validator(z.object({ id: GeoparkIdSchema }))
	.handler(({ data }) => generaNearGeopark(data.id));

/** Header search; separate from geosites and places so none waits on another. */
export const searchFossilGeneraFn = createServerFn({ method: "GET" })
	.validator(z.object({ q: z.string().trim().min(2).max(60) }))
	.handler(({ data }) => searchFossilGenera(data.q));
