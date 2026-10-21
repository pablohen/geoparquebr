import { ActionIcon, Anchor, Tooltip } from "@mantine/core";
import { Path } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { m } from "~/paraglide/messages.js";
import { MAX_TRIP_STOPS, type TripStop } from "../schemas";
import { useTrip } from "../store";

/** Adds one geosite to this device's trip, or takes it out. */
export function TripButton({ stop }: { stop: TripStop }) {
	const { has, full, add, remove } = useTrip();
	const inTrip = has(stop.slug);
	const label = inTrip
		? m.trip_remove()
		: full
			? m.trip_full({ max: MAX_TRIP_STOPS })
			: m.trip_add();
	return (
		<Tooltip label={label} withinPortal>
			<ActionIcon
				variant={inTrip ? "light" : "default"}
				size={30}
				aria-label={label}
				aria-pressed={inTrip}
				disabled={!inTrip && full}
				onClick={() => (inTrip ? remove(stop.slug) : add([stop]))}
			>
				<Path size={16} weight={inTrip ? "bold" : "regular"} />
			</ActionIcon>
		</Tooltip>
	);
}

/** "Roteiro (3)", once the trip has stops; nothing during SSR. */
export function TripLink() {
	const { trip } = useTrip();
	if (trip.length === 0) return null;
	return (
		<Anchor renderRoot={(props) => <Link {...props} to="/trip" />} size="xs">
			{m.trip_link({ count: trip.length })}
		</Anchor>
	);
}
