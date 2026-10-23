import { Stack, Switch, Text } from "@mantine/core";
import { Path } from "@phosphor-icons/react";
import { m } from "~/paraglide/messages.js";

type Props = {
	on: boolean;
	onChange: (on: boolean) => void;
};

/** "Roteiro no mapa": draws this device's trip as a numbered route. */
export function TripMapControl({ on, onChange }: Props) {
	return (
		<Stack gap={6}>
			<Switch
				size="sm"
				label={m.map_trip()}
				thumbIcon={<Path size={10} />}
				checked={on}
				onChange={(e) => onChange(e.currentTarget.checked)}
			/>
			{on && (
				<Text size="xs" c="dimmed">
					{m.map_trip_hint()}
				</Text>
			)}
		</Stack>
	);
}
