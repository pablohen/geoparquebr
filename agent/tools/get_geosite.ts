import { defineTool } from "eve/tools";
import { SlugInputSchema } from "~/features/trip-agent/schemas";

export default defineTool({
	description:
		"One geosite's details by slug: summary, description (trimmed), age, protected areas, marks and risk.",
	inputSchema: SlugInputSchema,
	async execute({ slug }) {
		const { findAgentGeosite } = await import(
			"~/features/trip-agent/trip-agent.server"
		);
		const geosite = await findAgentGeosite(slug);
		if (!geosite) throw new Error(`No geosite with slug "${slug}".`);
		return geosite;
	},
});
