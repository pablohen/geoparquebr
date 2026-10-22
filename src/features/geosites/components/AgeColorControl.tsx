import { Box, Group, Paper, Stack, Switch, Text } from "@mantine/core";
import { Palette } from "@phosphor-icons/react";
import { periodLabel } from "~/features/geology/labels";
import { GEOLOGIC_PERIODS } from "~/features/geology/time-scale";
import { m } from "~/paraglide/messages.js";
import type { GeositeSummary } from "../schemas";
import { UNDATED_COLOR } from "./pinColors";

type Props = {
	on: boolean;
	onChange: (on: boolean) => void;
	/** The geosites on screen, so the legend lists only their periods. */
	geosites: GeositeSummary[];
};

/** "Cores por idade": pins in the chart colours, with a legend of what's shown. */
export function AgeColorControl({ on, onChange, geosites }: Props) {
	const shown = new Set(geosites.map((g) => g.period));
	const periods = GEOLOGIC_PERIODS.filter((p) => shown.has(p.id));
	const undated = shown.has(undefined);
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
					label={m.map_pins_by_age()}
					thumbIcon={<Palette size={10} />}
					checked={on}
					onChange={(e) => onChange(e.currentTarget.checked)}
				/>
				{on && (
					<Stack
						gap={2}
						component="ul"
						m={0}
						p={0}
						aria-label={m.map_pins_legend()}
					>
						{periods.map((p) => (
							<Legend key={p.id} color={p.color} label={periodLabel(p.id)} />
						))}
						{undated && (
							<Legend color={UNDATED_COLOR} label={m.map_pins_undated()} />
						)}
						<Text size="xs" c="dimmed" mt={2}>
							{m.map_pins_clusters()}
						</Text>
					</Stack>
				)}
			</Stack>
		</Paper>
	);
}

function Legend({ color, label }: { color: string; label: string }) {
	return (
		<Group component="li" gap={6} wrap="nowrap" style={{ listStyle: "none" }}>
			<Box
				aria-hidden
				w={10}
				h={10}
				style={{
					flex: "none",
					borderRadius: 999,
					background: color,
					boxShadow: "0 0 0 1.5px #fff, 0 0 0 2.5px rgb(0 0 0 / 0.25)",
				}}
			/>
			<Text size="xs">{label}</Text>
		</Group>
	);
}
