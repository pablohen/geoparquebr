import { defineTool } from "eve/tools";
import { ItinerariesInputSchema } from "~/features/trip-agent/schemas";

export default defineTool({
	description:
		"Ready-made 1-day and 2-day itineraries in a geopark (`gp`, a geopark id) or a state (`uf`, e.g. CE): the best tourism-rated geosites close together, in visiting order, with approximate straight-line km per day.",
	inputSchema: ItinerariesInputSchema,
	async execute(input) {
		const { findAgentItineraries } = await import(
			"~/features/trip-agent/trip-agent.server"
		);
		return findAgentItineraries(input);
	},
});
