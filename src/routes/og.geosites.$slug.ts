import { createFileRoute } from "@tanstack/react-router";
import { cardResponse } from "~/features/share/card-response";

/** Share image for a geosite page (see share-card.server.tsx). */
export const Route = createFileRoute("/og/geosites/$slug")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				// Loaded lazily: fonts and wasm stay out of every other route.
				const { geositeCard } = await import(
					"~/features/share/share-card.server"
				);
				return cardResponse(await geositeCard(params.slug));
			},
		},
	},
});
