import { createFileRoute } from "@tanstack/react-router";
import { cardResponse } from "~/features/share/card-response";
import { UnitSlugSchema } from "~/features/units/schemas";

/** Share image for a rock unit page (see page-cards.server.ts). */
export const Route = createFileRoute("/og/units/$slug")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const slug = UnitSlugSchema.safeParse(params.slug);
				if (!slug.success) return cardResponse(null);
				const { unitCard } = await import("~/features/share/page-cards.server");
				return cardResponse(await unitCard(slug.data));
			},
		},
	},
});
