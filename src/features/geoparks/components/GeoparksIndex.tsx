import {
	Anchor,
	Card,
	Group,
	SimpleGrid,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { ChartBar } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { geoparkIdLabel } from "~/features/geosites/labels";
import type { GeoparkId } from "~/features/geosites/schemas";
import { m } from "~/paraglide/messages.js";
import { GEOPARKS } from "../geoparks";
import { geoparkAbout } from "../labels";

type Props = { counts: Partial<Record<GeoparkId, number>> };

/** Every UNESCO Global Geopark in Brazil, oldest designation first. */
export function GeoparksIndex({ counts }: Props) {
	const ids = Object.keys(GEOPARKS) as GeoparkId[];
	return (
		<Stack gap="lg">
			<Stack gap={6}>
				<Title order={1} size="h2">
					{m.geoparks_title()}
				</Title>
				<Text c="dimmed">{m.geoparks_intro()}</Text>
				<Anchor
					size="sm"
					style={{ alignSelf: "flex-start" }}
					renderRoot={(props) => <Link {...props} to="/geoparks/compare" />}
				>
					<Group gap={4}>
						<ChartBar size={14} aria-hidden />
						{m.compare_link()}
					</Group>
				</Anchor>
			</Stack>
			<SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
				{ids.map((id) => (
					<Card
						key={id}
						withBorder
						radius="md"
						padding="md"
						renderRoot={(props) => (
							<Link
								{...props}
								to="/geoparks/$geoparkId"
								params={{ geoparkId: id }}
							/>
						)}
					>
						<Stack gap={6}>
							<Text fw={700}>{geoparkIdLabel(id)}</Text>
							<Text size="sm">{geoparkAbout(id)}</Text>
							<Group justify="space-between" gap="xs" mt={4}>
								<Text size="xs" c="dimmed">
									{m.geopark_designated({ year: GEOPARKS[id].designated })}
								</Text>
								<Text size="xs" c="dimmed">
									{m.geopark_geosites_count({ count: counts[id] ?? 0 })}
								</Text>
							</Group>
						</Stack>
					</Card>
				))}
			</SimpleGrid>
		</Stack>
	);
}
