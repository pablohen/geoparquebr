import { ActionIcon, Paper, Stack, Text, Tooltip } from "@mantine/core";
import { Crosshair } from "@phosphor-icons/react";
import { useState } from "react";
import { m } from "~/paraglide/messages.js";

type Props = {
	active: boolean;
	/** The traveller's position; it stays on the device. */
	onLocate: (point: [number, number]) => void;
	onClear: () => void;
};

/**
 * "Perto de mim": centres the map on the traveller and ranks the list by
 * distance. An icon under the zoom buttons, where map apps put it; a second
 * tap goes back to the map's own list.
 */
export function NearMeControl({ active, onLocate, onClear }: Props) {
	const [locating, setLocating] = useState(false);
	const [failed, setFailed] = useState(false);

	const locate = () => {
		setLocating(true);
		setFailed(false);
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				setLocating(false);
				onLocate([pos.coords.longitude, pos.coords.latitude]);
			},
			() => {
				setLocating(false);
				setFailed(true);
			},
			{ timeout: 10_000, maximumAge: 300_000 },
		);
	};
	const label = active ? m.near_clear() : m.near_button();

	return (
		<Stack gap={6} align="flex-end">
			<Tooltip label={label} position="left" withinPortal>
				<ActionIcon
					// MapLibre's own buttons are 29 px.
					size={29}
					radius={4}
					// White with a dark icon, like MapLibre's buttons in either theme.
					variant={active ? "filled" : "white"}
					c={active ? undefined : "#333"}
					loading={locating}
					onClick={active ? onClear : locate}
					aria-label={label}
					aria-pressed={active}
					style={{ boxShadow: "0 0 0 2px rgb(0 0 0 / 0.1)" }}
				>
					<Crosshair size={17} weight={active ? "bold" : "regular"} />
				</ActionIcon>
			</Tooltip>
			{failed && (
				<Paper p={6} radius="sm" shadow="sm" maw={200}>
					<Text size="xs">{m.trip_location_error()}</Text>
				</Paper>
			)}
		</Stack>
	);
}
