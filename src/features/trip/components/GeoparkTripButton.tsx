import { Button } from "@mantine/core";
import { Path } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import type { GeoparkGeosite } from "~/features/geoparks/schemas";
import type { GeoparkId } from "~/features/geosites/schemas";
import { m } from "~/paraglide/messages.js";
import { suggestOrder } from "../route";
import type { TripStop } from "../schemas";
import { toStop, useTrip } from "../store";

/** Adds a geopark's geosites to the trip, in a suggested order, and opens it. */
export function GeoparkTripButton({
	id,
	geosites,
}: {
	id: GeoparkId;
	geosites: GeoparkGeosite[];
}) {
	const { add } = useTrip();
	const navigate = useNavigate();
	const stops = geosites.map((g) => toStop({ ...g, geoparkId: id }));
	return (
		<Button
			variant="default"
			leftSection={<Path size={16} />}
			onClick={() => {
				add(
					suggestOrder(stops.map((s) => s.point)).map(
						(i) => stops[i] as TripStop,
					),
				);
				navigate({ to: "/trip" });
			}}
		>
			{m.trip_geopark_add()}
		</Button>
	);
}
