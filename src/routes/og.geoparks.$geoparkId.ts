import { createFileRoute } from "@tanstack/react-router";
import { GeoparkIdSchema } from "~/features/geosites/schemas";
import { cardResponse } from "~/features/share/card-response";

/** Share image for a geopark page (see share-card.server.tsx). */
export const Route = createFileRoute("/og/geoparks/$geoparkId")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const id = GeoparkIdSchema.safeParse(params.geoparkId);
				if (!id.success) return cardResponse(null);
				const { geoparkCard } = await import(
					"~/features/share/share-card.server"
				);
				return cardResponse(await geoparkCard(id.data));
			},
		},
	},
});
