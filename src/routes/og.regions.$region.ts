import { createFileRoute } from "@tanstack/react-router";
import { cardResponse } from "~/features/share/card-response";
import { RegionSchema } from "~/features/states/schemas";

/** Share image for a region page (see page-cards.server.ts). */
export const Route = createFileRoute("/og/regions/$region")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const region = RegionSchema.safeParse(params.region);
				if (!region.success) return cardResponse(null);
				const { regionCard } = await import(
					"~/features/share/page-cards.server"
				);
				return cardResponse(await regionCard(region.data));
			},
		},
	},
});
