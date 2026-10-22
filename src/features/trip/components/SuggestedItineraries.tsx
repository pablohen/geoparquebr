import {
	Anchor,
	Button,
	Group,
	List,
	SegmentedControl,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { Path } from "@phosphor-icons/react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { formatDistance } from "~/features/geosites/components/categoryStyle";
import { useServerQuery } from "~/lib/use-server-query";
import { m } from "~/paraglide/messages.js";
import { dayMeters } from "../itineraries";
import type { ItinerariesQuery, TripStop } from "../schemas";
import { useTrip } from "../store";
import { getItineraries } from "../trip.functions";

/** "Roteiros sugeridos" for a geopark or state, loadable as the trip. */
export function SuggestedItineraries({ query }: { query: ItinerariesQuery }) {
	const key = "gp" in query ? `gp:${query.gp}` : `uf:${query.uf}`;
	const result = useServerQuery(`itineraries:${key}`, () =>
		getItineraries({ data: query }),
	);
	const [days, setDays] = useState<"1" | "2">("1");
	const { trip, replace } = useTrip();
	const navigate = useNavigate();

	// Nothing until loaded: the section is a suggestion, not the page.
	if (result.status !== "success") return null;
	const { oneDay, twoDays } = result.data;
	const plan: TripStop[][] =
		days === "2" && twoDays.length === 2 ? [...twoDays] : [oneDay];

	return (
		<Stack gap="sm" component="section">
			<Stack gap={2}>
				<Title order={2} size="h4">
					{m.itinerary_title()}
				</Title>
				<Text size="sm" c="dimmed">
					{m.itinerary_intro()}
				</Text>
			</Stack>
			{oneDay.length === 0 ? (
				<Text size="sm" c="dimmed">
					{m.itinerary_none()}
				</Text>
			) : (
				<>
					{twoDays.length === 2 && (
						<SegmentedControl
							size="xs"
							value={days}
							onChange={(v) => setDays(v === "2" ? "2" : "1")}
							data={[
								{ value: "1", label: m.itinerary_one_day() },
								{ value: "2", label: m.itinerary_two_days() },
							]}
							style={{ alignSelf: "flex-start" }}
						/>
					)}
					{plan.map((stops, d) => (
						<Stack key={stops[0]?.slug ?? d} gap={4}>
							{plan.length > 1 && (
								<Text size="sm" fw={600}>
									{m.itinerary_day({ n: d + 1 })}
								</Text>
							)}
							<List type="ordered" size="sm" spacing={2}>
								{stops.map((s) => (
									<List.Item key={s.slug}>
										<Anchor
											size="sm"
											renderRoot={(props) => (
												<Link
													{...props}
													to="/geosites/$slug"
													params={{ slug: s.slug }}
												/>
											)}
										>
											{s.name}
										</Anchor>{" "}
										<Text span size="xs" c="dimmed">
											{s.municipality} – {s.state}
										</Text>
									</List.Item>
								))}
							</List>
							<Text size="xs" c="dimmed">
								{m.itinerary_distance({
									distance: formatDistance(dayMeters(stops)),
								})}
							</Text>
						</Stack>
					))}
					<Group>
						<Button
							variant="light"
							leftSection={<Path size={16} />}
							onClick={() => {
								replace(plan.flat());
								navigate({ to: "/trip" });
							}}
						>
							{trip.length > 0
								? m.itinerary_replace({ count: trip.length })
								: m.itinerary_use()}
						</Button>
					</Group>
				</>
			)}
		</Stack>
	);
}
