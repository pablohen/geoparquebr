import { createFileRoute } from "@tanstack/react-router";
import { CardPageSchema, cardResponse } from "~/features/share/card-response";

/** Share image for a listing page (see page-cards.server.ts). */
export const Route = createFileRoute("/og/pages/$page")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const page = CardPageSchema.safeParse(params.page);
				if (!page.success) return cardResponse(null);
				const { pageCard } = await import("~/features/share/page-cards.server");
				return cardResponse(await pageCard(page.data));
			},
		},
	},
});
