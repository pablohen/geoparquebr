import { defineTool } from "eve/tools";
import { SearchGeositesInputSchema } from "~/features/trip-agent/schemas";

export default defineTool({
	description:
		"Find geosites by geopark, state, theme or free text. Results are sorted by tourism mark (best first) and carry no coordinates.",
	inputSchema: SearchGeositesInputSchema,
	async execute(input) {
		const { findAgentGeosites } = await import(
			"~/features/trip-agent/trip-agent.server"
		);
		return { geosites: await findAgentGeosites(input) };
	},
});
