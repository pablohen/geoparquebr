/** RPCs for the field guides; safe to import anywhere. */
import { createServerFn } from "@tanstack/react-start";
import { findGeoparkGuide, findGuideEntries } from "./guide.server";
import { GuideByGeoparkSchema, GuideBySlugsSchema } from "./schemas";

// Server functions run outside the URL's locale, so the guide passes its own.
export const getGuideEntries = createServerFn({ method: "GET" })
	.validator(GuideBySlugsSchema)
	.handler(({ data }) =>
		findGuideEntries([...new Set(data.slugs)], data.locale),
	);

export const getGeoparkGuide = createServerFn({ method: "GET" })
	.validator(GuideByGeoparkSchema)
	.handler(({ data }) => findGeoparkGuide(data.id, data.locale));
