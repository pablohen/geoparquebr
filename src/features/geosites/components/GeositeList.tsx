import { Badge, Group, NavLink, Stack, Text } from "@mantine/core";
import { MapPinSimpleArea } from "@phosphor-icons/react";
import { GEOSITE_CATEGORY_LABELS, type GeositeSummary } from "../schemas";
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
				<Text size="sm">Nenhum geossítio neste raio.</Text>
				<Text size="xs">Aumente o raio ou mova o mapa.</Text>
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
										{GEOSITE_CATEGORY_LABELS[c]}
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
