import { defineTool } from "eve/tools";
import {
	ProposeTripInputSchema,
	TripProposalSchema,
} from "~/features/trip-agent/schemas";

export default defineTool({
	description:
		"Show the visitor a trip plan: geosite slugs in visiting order. The site draws it as a card they can add to their trip. Approximate points and unknown slugs are dropped and listed in `skipped`.",
	inputSchema: ProposeTripInputSchema,
	outputSchema: TripProposalSchema,
	async execute(input) {
		const { proposeTrip } = await import(
			"~/features/trip-agent/trip-agent.server"
		);
		return proposeTrip(input);
	},
	// The model only needs what was kept; the card reads the full output.
	toModelOutput: (output) => ({
		type: "json",
		value: {
			stops: output.stops.map((s) => s.slug),
			totalKm: output.totalKm,
			skipped: output.skipped,
		},
	}),
});
