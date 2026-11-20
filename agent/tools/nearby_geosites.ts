import { defineTool } from "eve/tools";
import { SlugInputSchema } from "~/features/trip-agent/schemas";

export default defineTool({
	description:
		"The geosites closest to one geosite (within 300 km), with approximate straight-line distances in km.",
	inputSchema: SlugInputSchema,
	async execute({ slug }) {
		const { findAgentNearby } = await import(
			"~/features/trip-agent/trip-agent.server"
		);
		const nearby = await findAgentNearby(slug);
		if (!nearby) throw new Error(`No geosite with slug "${slug}".`);
		return { nearby };
	},
});
