import { Badge, Group, NavLink, Stack, Text } from "@mantine/core";
import { MapPinSimpleArea } from "@phosphor-icons/react";
import { m } from "~/paraglide/messages.js";
import { categoryLabel } from "../labels";
import type { GeositeSummary } from "../schemas";
import { CATEGORY_COLORS, formatDistance } from "./categoryStyle";

type Props = {
	geosites: GeositeSummary[];
	selectedSlug?: string;
	onSelect: (slug: string) => void;
};

export function GeositeList({ geosites, selectedSlug, onSelect }: Props) {
	if (geosites.length === 0) {
		return (
			<Stack align="center" gap={4} py="xl" c="dimmed">
				<MapPinSimpleArea size={32} />
				<Text size="sm">{m.list_empty_title()}</Text>
				<Text size="xs">{m.list_empty_hint()}</Text>
			</Stack>
		);
	}

	return (
		<Stack gap={2}>
			{geosites.map((g) => (
				<NavLink
					key={g.id}
					active={g.slug === selectedSlug}
					onClick={() => onSelect(g.slug)}
					label={
						<Text fw={600} size="sm" lineClamp={1}>
							{g.name}
						</Text>
					}
					description={
						<Stack gap={6} mt={2}>
							<Text size="xs" c="dimmed">
								{g.municipality} – {g.state}
							</Text>
							<Group gap={4}>
								{g.categories.map((c) => (
									<Badge
										key={c}
										size="xs"
										variant="light"
										color={CATEGORY_COLORS[c]}
									>
										{categoryLabel(c)}
									</Badge>
								))}
							</Group>
						</Stack>
					}
					rightSection={
						<Text size="xs" c="dimmed" ff="monospace">
							{formatDistance(g.distanceMeters)}
						</Text>
					}
					styles={{ root: { borderRadius: "var(--mantine-radius-md)" } }}
				/>
			))}
		</Stack>
	);
}
