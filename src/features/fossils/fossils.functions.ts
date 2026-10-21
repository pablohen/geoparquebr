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
