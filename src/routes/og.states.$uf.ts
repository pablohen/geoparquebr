import { createFileRoute } from "@tanstack/react-router";
import { cardResponse } from "~/features/share/card-response";
import { UfParamSchema } from "~/features/states/schemas";

/** Share image for a state page (see page-cards.server.ts). */
export const Route = createFileRoute("/og/states/$uf")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const uf = UfParamSchema.safeParse(params.uf);
				if (!uf.success) return cardResponse(null);
				const { stateCard } = await import(
					"~/features/share/page-cards.server"
				);
				return cardResponse(await stateCard(uf.data));
			},
		},
	},
});
