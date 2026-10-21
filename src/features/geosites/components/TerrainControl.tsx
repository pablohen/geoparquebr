import { Paper, Stack, Switch, Text } from "@mantine/core";
import { Mountains } from "@phosphor-icons/react";
import { m } from "~/paraglide/messages.js";

type Props = {
	on: boolean;
	onChange: (on: boolean) => void;
};

/** "Relevo 3D": opt-in terrain, since it costs GPU and data on cheap phones. */
export function TerrainControl({ on, onChange }: Props) {
	return (
		<Paper
			p={{ base: 6, sm: "xs" }}
			radius="md"
			shadow="sm"
			// A compact chip on phones; a full panel from `sm` up.
			w={on ? { base: 180, sm: 230 } : { base: "auto", sm: 230 }}
		>
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
		</Paper>
	);
}
