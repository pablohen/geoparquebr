import { Button, List, Stack, Text, Title } from "@mantine/core";
import { useMounted } from "@mantine/hooks";
import { Path } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { m } from "~/paraglide/messages.js";
import type { TripStop } from "../schemas";
import { useTrip } from "../store";

/** A trip opened from a shared link; it becomes this device's trip on request. */
export function SharedTripView({
	stops,
	onUse,
}: {
	stops: TripStop[];
	onUse: () => void;
}) {
	const mounted = useMounted();
	const { trip, replace } = useTrip();

	return (
		<Stack gap="lg">
			<Stack gap={6}>
				<Title order={1} size="h2">
					{m.trip_shared_title()}
				</Title>
				<Text c="dimmed">{m.trip_shared_intro()}</Text>
			</Stack>

			{stops.length === 0 ? (
				<Text c="dimmed">{m.trip_shared_none()}</Text>
			) : (
				<>
					<List type="ordered" spacing={4}>
						{stops.map((s) => (
							<List.Item key={s.slug}>
								<Text
									size="sm"
									fw={600}
									span
									renderRoot={(props) => (
										<Link
											{...props}
											to="/geosites/$slug"
											params={{ slug: s.slug }}
										/>
									)}
								>
									{s.name}
								</Text>{" "}
								<Text size="xs" c="dimmed" span>
									{s.municipality} – {s.state}
								</Text>
							</List.Item>
						))}
					</List>
					<Stack gap={6} align="flex-start">
						<Button
							leftSection={<Path size={16} />}
							onClick={() => {
								replace(stops);
								onUse();
							}}
						>
							{m.trip_use_shared()}
						</Button>
						{mounted && trip.length > 0 && (
							<Text size="xs" c="dimmed">
								{m.trip_shared_replaces({
									stops: m.trip_stops_count({ count: trip.length }),
								})}
							</Text>
						)}
					</Stack>
				</>
			)}
		</Stack>
	);
}
