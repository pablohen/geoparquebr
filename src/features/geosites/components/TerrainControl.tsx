import { Stack, Switch, Text } from "@mantine/core";
import { Mountains } from "@phosphor-icons/react";
import { m } from "~/paraglide/messages.js";

type Props = {
	on: boolean;
	onChange: (on: boolean) => void;
};

/** "Relevo 3D": opt-in terrain, since it costs GPU and data on cheap phones. */
export function TerrainControl({ on, onChange }: Props) {
	return (
		<Stack gap={6}>
			<Switch
				size="sm"
				label={m.map_terrain()}
				thumbIcon={<Mountains size={10} />}
				checked={on}
				onChange={(e) => onChange(e.currentTarget.checked)}
			/>
			{on && (
				<Text size="xs" c="dimmed">
					{m.map_terrain_hint()}
				</Text>
			)}
		</Stack>
	);
}
