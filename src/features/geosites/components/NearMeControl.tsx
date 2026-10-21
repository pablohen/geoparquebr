import { Button, Paper, Stack, Text } from "@mantine/core";
import { Crosshair, X } from "@phosphor-icons/react";
import { useState } from "react";
import { m } from "~/paraglide/messages.js";

type Props = {
	active: boolean;
	/** The traveller's position; it stays on the device. */
	onLocate: (point: [number, number]) => void;
	onClear: () => void;
};

/** "Perto de mim": centres the map on the traveller and ranks the list by distance. */
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

	return (
		<Paper p={4} radius="md" shadow="sm">
			<Stack gap={4}>
				{active ? (
					<Button
						size="compact-sm"
						variant="light"
						leftSection={<Crosshair size={14} />}
						rightSection={<X size={12} />}
						onClick={onClear}
						aria-label={m.near_clear()}
					>
						{m.near_active()}
					</Button>
				) : (
					<Button
						size="compact-sm"
						variant="subtle"
						color="gray"
						leftSection={<Crosshair size={14} />}
						loading={locating}
						onClick={locate}
					>
						{m.near_button()}
					</Button>
				)}
				{failed && (
					<Text size="xs" c="dimmed" px={4} maw={180}>
						{m.trip_location_error()}
					</Text>
				)}
			</Stack>
		</Paper>
	);
}
