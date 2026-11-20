import { Anchor, Button, Card, Group, List, Stack, Text } from "@mantine/core";
import { Check, Path } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useTrip } from "~/features/trip/store";
import { m } from "~/paraglide/messages.js";
import type { TripProposal } from "../schemas";

/** A trip the agent proposed: its stops, and buttons into the trip feature. */
export function TripProposalCard({
	proposal,
	onOpen,
}: {
	proposal: TripProposal;
	/** A link was followed (closes the drawer). */
	onOpen: () => void;
}) {
	const { has, add } = useTrip();
	const slugs = proposal.stops.map((s) => s.slug);
	const added = slugs.length > 0 && slugs.every(has);
	return (
		<Card withBorder padding="sm" radius="md">
			<Stack gap="xs">
				<Text fw={600} size="sm">
					{proposal.title}
				</Text>
				<Text size="xs" c="dimmed">
					{m.agent_trip_summary({
						count: proposal.stops.length,
						km: proposal.totalKm,
					})}
				</Text>
				<List type="ordered" size="sm" spacing={2}>
					{proposal.stops.map((stop) => (
						<List.Item key={stop.slug}>
							<Anchor
								size="sm"
								renderRoot={(props) => (
									<Link
										{...props}
										to="/geosites/$slug"
										params={{ slug: stop.slug }}
										onClick={onOpen}
									/>
								)}
							>
								{stop.name}
							</Anchor>{" "}
							<Text span size="xs" c="dimmed">
								{stop.municipality}/{stop.state}
							</Text>
						</List.Item>
					))}
				</List>
				{proposal.skipped.length > 0 && (
					<Text size="xs" c="dimmed">
						{m.agent_trip_skipped({ count: proposal.skipped.length })}
					</Text>
				)}
				{proposal.stops.length > 0 && (
					<Group gap="xs">
						<Button
							size="xs"
							leftSection={added ? <Check size={14} /> : <Path size={14} />}
							variant={added ? "light" : "filled"}
							disabled={added}
							onClick={() => add(proposal.stops)}
						>
							{added ? m.agent_trip_added() : m.agent_trip_add()}
						</Button>
						<Button
							size="xs"
							variant="default"
							renderRoot={(props) => (
								<Link
									{...props}
									to="/trip"
									search={{ stops: slugs.join(",") }}
									onClick={onOpen}
								/>
							)}
						>
							{m.trip_open()}
						</Button>
					</Group>
				)}
			</Stack>
		</Card>
	);
}
